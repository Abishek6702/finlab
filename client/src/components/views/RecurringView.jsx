import { useState, useEffect, useCallback } from 'react';
import { Pencil, Plus, RefreshCw, Repeat, Trash2, X } from 'lucide-react';
import { recurringApi, accountApi, categoryApi } from '../../api/apiClient';
import { currencyStep, formatCurrencyAmount } from '../../moneyUtils';

function dateInputValue(value, timeZone) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: String(timeZone || 'UTC').toUpperCase() === 'IST' ? 'Asia/Kolkata' : (timeZone || 'UTC'),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export default function RecurringView({ initialTab = 'all' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    currency: 'USD',
    accountId: '',
    categoryId: '',
    description: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    autoPostEnabled: false,
  });

  const loadRecurring = useCallback(() => {
    Promise.all([
      recurringApi.getAll(),
      recurringApi.getOccurrences(),
      accountApi.getAll(),
      categoryApi.getAll(),
    ])
      .then(([recRes, occRes, accRes, catRes]) => {
        if (recRes.data?.success) {
          setSchedules(recRes.data.data || []);
        }
        if (occRes.data?.success) {
          setOccurrences(occRes.data.data || []);
        }
        if (accRes.data?.success) {
          const accs = accRes.data.data || [];
          setAccounts(accs);
          if (accs.length > 0) {
            setFormData((prev) => {
              const activeAcc = accs.find((a) => a._id === prev.accountId) || accs[0];
              return {
                ...prev,
                accountId: activeAcc._id,
                currency: activeAcc.currency || 'USD',
              };
            });
          }
        }
        if (catRes.data?.success) {
          setCategories(catRes.data.data || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRecurring();
  }, [loadRecurring]);

  const openCreateModal = () => {
    setEditingSchedule(null);
    setFormData({
      type: 'expense',
      amount: '',
      currency: accounts[0]?.currency || 'USD',
      accountId: accounts[0]?._id || '',
      categoryId: '',
      description: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      autoPostEnabled: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      type: schedule.type,
      amount: String(schedule.amount ?? ''),
      currency: schedule.currency || schedule.accountId?.currency || 'USD',
      accountId: schedule.accountId?._id || schedule.accountId || '',
      categoryId: schedule.categoryId?._id || schedule.categoryId || '',
      description: schedule.description || '',
      frequency: schedule.frequency || 'monthly',
      startDate: dateInputValue(schedule.startDate, schedule.timeZone),
      autoPostEnabled: Boolean(schedule.autoPostEnabled),
    });
    setModalOpen(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const selectedAcc = accounts.find((a) => a._id === formData.accountId) || accounts[0];
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        currency: selectedAcc?.currency || formData.currency || 'USD',
      };
      if (editingSchedule) await recurringApi.update(editingSchedule._id, payload);
      else await recurringApi.create(payload);
      setModalOpen(false);
      setEditingSchedule(null);
      setFormData({
        type: 'expense',
        amount: '',
        currency: accounts[0]?.currency || 'USD',
        accountId: accounts[0]?._id || '',
        categoryId: '',
        description: '',
        frequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        autoPostEnabled: false,
      });
      loadRecurring();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${editingSchedule ? 'update' : 'create'} recurring schedule`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    const confirmed = window.confirm(
      `Delete “${schedule.description || 'this recurring schedule'}”? Unposted occurrences will be skipped; posted transactions will remain in your history.`
    );
    if (!confirmed) return;
    try {
      await recurringApi.delete(schedule._id);
      loadRecurring();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete recurring schedule');
    }
  };

  const handlePostOccurrence = async (occId) => {
    try {
      await recurringApi.postOccurrence(occId, {});
      alert('Occurrence successfully posted to ledger!');
      loadRecurring();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post occurrence');
    }
  };

  const filteredSchedules = schedules.filter((s) => {
    if (activeTab === 'paused') return s.status === 'paused';
    if (activeTab === 'upcoming' || activeTab === 'pending') return s.status === 'active';
    return true;
  });

  const pendingOccurrences = occurrences.filter((o) => o.status === 'pending');

  const tabs = [
    { id: 'all', label: 'All Recurring' },
    { id: 'pending', label: `Pending (${pendingOccurrences.length})` },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'paused', label: 'Paused' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Recurring Transactions</h2>
          <p className="text-xs text-[var(--text-secondary)]">Automate subscriptions, bills, salaries and scheduled cash flows</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
        >
          <Plus className="size-4" />
          Schedule Recurring
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] pb-2 text-xs font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3.5 py-2 transition ${
              activeTab === tab.id
                ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending Occurrences Alert if on Pending tab */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--text)]">Occurrences Waiting For Confirmation</h3>
          {pendingOccurrences.length > 0 ? (
            <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
              {pendingOccurrences.map((occ) => (
                <div key={occ._id} className="flex items-center justify-between p-4 text-xs">
                  <div>
                    <div className="font-semibold text-[var(--text)]">
                      {occ.recurringTransactionId?.description || 'Recurring Item'}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Due: {new Date(occ.occurrenceDate).toLocaleDateString()} • Manual Confirmation Required
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[var(--text)]">
                      {occ.currency} {occ.amount}
                    </span>
                    <button
                      onClick={() => handlePostOccurrence(occ._id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
                    >
                      Confirm & Post
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">No pending occurrences to confirm.</p>
          )}
        </div>
      )}

      {/* Schedules List */}
      {activeTab !== 'pending' && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <RefreshCw className="size-6 animate-spin text-[var(--primary)]" />
            </div>
          ) : filteredSchedules.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {filteredSchedules.map((s) => {
                const isIncome = s.type === 'income';
                return (
                  <div key={s._id} className="flex items-center justify-between p-4 text-xs hover:bg-[var(--surface-raised)]/40 transition">
                    <div className="flex items-center gap-3">
                      <div className={`grid size-9 place-items-center rounded-xl font-bold ${
                        isIncome ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        <Repeat className="size-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[var(--text)]">{s.description || 'Schedule'}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {s.frequency} • {s.accountId?.name || 'Account'} • Next: {new Date(s.nextOccurrenceDate).toLocaleDateString()}
                          {s.autoPostEnabled ? ' • (Auto-posts)' : ' • (Requires confirmation)'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`font-mono font-bold text-sm ${isIncome ? 'text-emerald-600' : 'text-[var(--text)]'}`}>
                          {isIncome ? '+' : '−'}{s.currency} {formatCurrencyAmount(s.amount, s.currency)}
                        </div>
                        <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          s.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          disabled={['completed', 'cancelled'].includes(s.status)}
                          aria-label={`Edit ${s.description || 'recurring schedule'}`}
                          title={['completed', 'cancelled'].includes(s.status) ? 'Completed schedules cannot be edited' : 'Edit schedule'}
                          className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(s)}
                          aria-label={`Delete ${s.description || 'recurring schedule'}`}
                          title="Delete schedule"
                          className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-rose-500/10 hover:text-rose-600"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-[var(--text-secondary)]">
              <p className="font-semibold">No recurring schedules found</p>
              <button
                onClick={openCreateModal}
                className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white"
              >
                Schedule First Payment
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-[var(--text)]">{editingSchedule ? 'Edit Recurring Schedule' : 'Schedule Recurring'}</h3>
              <button type="button" onClick={() => { setModalOpen(false); setEditingSchedule(null); }} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-raised)] p-1 font-semibold">
                {['expense', 'income'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, type: t, categoryId: '' }))}
                    className={`rounded-lg py-2 capitalize transition ${
                      formData.type === t ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Netflix Subscription, Monthly Salary, Rent"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Amount</label>
                  <input
                    type="number"
                    min={currencyStep(formData.currency)}
                    step={currencyStep(formData.currency)}
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData((prev) => ({ ...prev, frequency: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
                {editingSchedule && (
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    Changing this date replaces unposted occurrences. Posted transactions are kept.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Account</label>
                  <select
                    required
                    value={formData.accountId}
                    onChange={(e) => {
                      const accId = e.target.value;
                      const acc = accounts.find((a) => a._id === accId);
                      setFormData((prev) => ({
                        ...prev,
                        accountId: accId,
                        currency: acc ? acc.currency : prev.currency,
                      }));
                    }}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Category</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.filter((c) => c.type === formData.type).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoPost"
                  checked={formData.autoPostEnabled}
                  onChange={(e) => setFormData((prev) => ({ ...prev, autoPostEnabled: e.target.checked }))}
                  className="rounded border-[var(--border)]"
                />
                <label htmlFor="autoPost" className="text-xs text-[var(--text)]">
                  Automatically post to ledger (no manual confirmation required)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setEditingSchedule(null); }}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                >
                  {actionLoading ? (editingSchedule ? 'Saving...' : 'Scheduling...') : (editingSchedule ? 'Save Changes' : 'Save Schedule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
