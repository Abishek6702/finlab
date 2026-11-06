import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Pencil, Pause, Play, Plus, RefreshCw, Target, Trash2, X } from 'lucide-react';
import { savingsApi, accountApi } from '../../api/apiClient';
import { useAuth } from '../../hooks/useAuth';

function currencyMinorStep(currency) {
  try {
    return 10 ** -new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 0.01;
  }
}

function formatAmount(amount, currency = 'USD') {
  let digits = 2;
  try {
    digits = new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    // Unsupported legacy currency values use the two-decimal display fallback.
  }
  return `${currency} ${Number(amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function dateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '';
}

export default function SavingsGoalsView({ initialTab = 'all' }) {
  const { user } = useAuth();
  const preferredCurrency = user?.baseCurrency || 'USD';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goalHistory, setGoalHistory] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // New Goal Form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    currency: preferredCurrency,
    targetDate: '',
    linkedAccountId: '',
  });

  // Contribution Form
  const [contribData, setContribData] = useState({
    type: 'deposit',
    amount: '',
    notes: '',
  });

  const loadGoals = (tab) => {
    const params = {};
    if (['active', 'paused', 'completed'].includes(tab)) {
      params.status = tab;
    }

    Promise.all([
      savingsApi.getAll(params),
      accountApi.getAll(),
    ])
      .then(([gRes, aRes]) => {
        if (gRes.data?.success) {
          setGoals(gRes.data.data || []);
        }
        if (aRes.data?.success) {
          setAccounts(aRes.data.data || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGoals(activeTab);
  }, [activeTab]);

  const openCreateModal = () => {
    setEditingGoal(null);
    setFormData({
      name: '',
      description: '',
      targetAmount: '',
      currency: preferredCurrency,
      targetDate: '',
      linkedAccountId: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name || '',
      description: goal.description || '',
      targetAmount: String(goal.targetAmount ?? ''),
      currency: goal.currency || 'USD',
      targetDate: dateInputValue(goal.targetDate),
      linkedAccountId: goal.linkedAccountId?._id || goal.linkedAccountId || '',
    });
    setModalOpen(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...formData,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate || null,
        linkedAccountId: formData.linkedAccountId || null,
      };
      if (editingGoal) await savingsApi.update(editingGoal._id, payload);
      else await savingsApi.create(payload);
      setModalOpen(false);
      setEditingGoal(null);
      setFormData({
        name: '',
        description: '',
        targetAmount: '',
        currency: preferredCurrency,
        targetDate: '',
        linkedAccountId: '',
      });
      loadGoals(activeTab);
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${editingGoal ? 'update' : 'create'} savings goal`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!selectedGoal) return;
    setActionLoading(true);
    try {
      await savingsApi.recordContribution(selectedGoal._id, {
        type: contribData.type,
        amount: parseFloat(contribData.amount),
        notes: contribData.notes,
      });
      setContributeModalOpen(false);
      setSelectedGoal(null);
      setContribData({ type: 'deposit', amount: '', notes: '' });
      loadGoals(activeTab);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record contribution');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewHistory = async (goal) => {
    try {
      const res = await savingsApi.getHistory(goal._id);
      if (res.data?.success) {
        const data = res.data.data || {};
        setSelectedGoal(data.goal || goal);
        setGoalHistory(Array.isArray(data) ? data : data.contributions || []);
      }
      setActiveTab('history');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch goal history');
    }
  };

  const handleDeleteGoal = async (goal) => {
    const confirmed = window.confirm(
      `Delete “${goal.name}” and its contribution history? This does not change any account balance or ledger transaction.`
    );
    if (!confirmed) return;
    try {
      await savingsApi.delete(goal._id);
      loadGoals(activeTab);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete savings goal');
    }
  };

  const handleToggleGoal = async (goal) => {
    try {
      await savingsApi.update(goal._id, { status: goal.status === 'paused' ? 'active' : 'paused' });
      loadGoals(activeTab);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update savings goal');
    }
  };

  const handleSelectHistoryGoal = (goalId) => {
    const goal = goals.find((item) => item._id === goalId);
    if (goal) handleViewHistory(goal);
    else {
      setSelectedGoal(null);
      setGoalHistory([]);
    }
  };

  const tabs = [
    { id: 'all', label: 'All Goals' },
    { id: 'active', label: 'Active Goals' },
    { id: 'paused', label: 'Paused' },
    { id: 'completed', label: 'Completed Goals' },
    { id: 'history', label: 'Contribution History' },
  ];
  const supportedCurrencies = [...new Set(['USD', 'INR', 'EUR', 'GBP', 'JPY', preferredCurrency, ...accounts.map((account) => account.currency), formData.currency])];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Savings Goals</h2>
          <p className="text-xs text-[var(--text-secondary)]">Track progress toward vacation, emergency fund, or large purchases</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
        >
          <Plus className="size-4" />
          Create Goal
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

      {/* History view */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--text)]">Contribution History</h3>
              <p className="text-xs text-[var(--text-secondary)]">Review deposits and withdrawals by goal.</p>
            </div>
            <select
              value={selectedGoal?._id || ''}
              onChange={(e) => handleSelectHistoryGoal(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--text)] sm:max-w-xs"
            >
              <option value="">Select a savings goal</option>
              {goals.map((goal) => <option key={goal._id} value={goal._id}>{goal.name}</option>)}
            </select>
          </div>
          {selectedGoal ? (
            goalHistory.length > 0 ? (
              <div className="divide-y divide-[var(--border)] text-xs">
                {goalHistory.map((h) => {
                  const isWithdrawal = h.type === 'withdrawal';
                  return (
                    <div key={h._id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-[var(--text)] capitalize">{h.type || 'Deposit'}</div>
                        <div className="truncate text-[11px] text-[var(--text-muted)]">
                          {new Date(h.date || h.createdAt).toLocaleDateString()} {h.notes ? `• ${h.notes}` : ''}
                        </div>
                      </div>
                      <div className={`shrink-0 font-mono font-bold ${isWithdrawal ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isWithdrawal ? '−' : '+'}{formatAmount(h.amount, selectedGoal.currency || 'USD')}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-[var(--text-muted)]">No contributions recorded for this goal yet.</p>
            )
          ) : (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">Choose a goal to view its contribution history.</p>
          )}
        </div>
      )}

      {/* Goals Cards Grid */}
      {activeTab !== 'history' && (
        loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <RefreshCw className="size-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : goals.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => {
              const currentAmount = Number(g.currentAmount ?? 0);
              const targetAmount = Number(g.targetAmount ?? 0);
              const pct = g.percentage ?? (targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0);
              const remaining = Number(g.remaining ?? Math.max(0, targetAmount - currentAmount));
              const isDone = g.status === 'completed' || pct >= 100;
              const isPaused = g.status === 'paused';
              return (
                <div
                  key={g._id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-9 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                          <Target className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-bold text-[var(--text)]">{g.name}</h4>
                          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            isPaused ? 'bg-amber-500/10 text-amber-600' : isDone ? 'bg-emerald-500/10 text-emerald-600' : 'bg-sky-500/10 text-sky-600'
                          }`}>
                            {g.status}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-0.5">
                        <span className="mr-1 text-xs font-bold font-mono text-[var(--text)]">{pct}%</span>
                        <button type="button" onClick={() => openEditModal(g)} aria-label={`Edit ${g.name}`} title="Edit goal" className="grid size-7 place-items-center rounded-md text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]">
                          <Pencil className="size-3.5" />
                        </button>
                        {g.status !== 'completed' && (
                          <button type="button" onClick={() => handleToggleGoal(g)} aria-label={isPaused ? `Resume ${g.name}` : `Pause ${g.name}`} title={isPaused ? 'Resume goal' : 'Pause goal'} className="grid size-7 place-items-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]">
                            {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                          </button>
                        )}
                        <button type="button" onClick={() => handleDeleteGoal(g)} aria-label={`Delete ${g.name}`} title="Delete goal" className="grid size-7 place-items-center rounded-md text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-600">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {g.description && (
                      <p className="mt-3 text-xs text-[var(--text-secondary)] line-clamp-2">{g.description}</p>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
                        <div
                          className={`h-full rounded-full transition-all ${isDone ? 'bg-emerald-500' : 'bg-[var(--primary)]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono font-medium">
                        <span className="text-emerald-600 font-bold">
                          {formatAmount(currentAmount, g.currency)} saved
                        </span>
                        <span className="text-[var(--text-muted)]">
                          Target: {formatAmount(targetAmount, g.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 text-[11px] text-[var(--text-muted)]">
                        <span>{remaining > 0 ? `${formatAmount(remaining, g.currency)} remaining` : 'Target reached'}</span>
                        {g.targetDate && <span>Due {new Date(g.targetDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-xs">
                    <div className="flex items-center gap-3">
                      {!isPaused && !isDone && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGoal(g);
                            setContribData({ type: 'deposit', amount: '', notes: '' });
                            setContributeModalOpen(true);
                          }}
                          className="font-semibold text-[var(--primary)] hover:underline"
                        >
                          + Deposit
                        </button>
                      )}
                      {!isPaused && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGoal(g);
                            setContribData({ type: 'withdrawal', amount: '', notes: '' });
                            setContributeModalOpen(true);
                          }}
                          className="font-medium text-rose-600 hover:underline"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleViewHistory(g)}
                      className="text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      History
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-[var(--text-secondary)]">
            <p className="font-semibold">No savings goals found</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Create your first goal to track your milestone savings.</p>
            <button
              onClick={openCreateModal}
              className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white"
            >
              Create First Goal
            </button>
          </div>
        )
      )}

      {/* Create / Edit Goal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-[var(--text)]">{editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}</h3>
              <button type="button" onClick={() => { setModalOpen(false); setEditingGoal(null); }} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Emergency Fund, Japan Trip, New Laptop"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What are you saving for?"
                  className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Target Amount</label>
                  <input
                    type="number"
                    min={currencyMinorStep(formData.currency)}
                    step={currencyMinorStep(formData.currency)}
                    required
                    value={formData.targetAmount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, targetAmount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      currency: e.target.value,
                      linkedAccountId: accounts.some((account) => account._id === prev.linkedAccountId && account.currency === e.target.value)
                        ? prev.linkedAccountId
                        : '',
                    }))}
                    disabled={Boolean(editingGoal)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {supportedCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Target Date (Optional)</label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, targetDate: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Linked Account (Optional)</label>
                <select
                  value={formData.linkedAccountId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, linkedAccountId: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                >
                  <option value="">None / External</option>
                  {accounts.filter((a) => a.currency === formData.currency).map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {editingGoal ? 'Currency stays fixed so saved contributions keep their original value. ' : ''}
                  This is a reference account; goal contributions do not move account funds.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setEditingGoal(null); }}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                >
                  {actionLoading ? (editingGoal ? 'Saving...' : 'Creating...') : (editingGoal ? 'Save Changes' : 'Create Goal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Deposit Modal */}
      {contributeModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-[var(--text)]">{contribData.type === 'withdrawal' ? 'Withdraw Savings' : 'Add to Goal'}</h3>
              <button type="button" onClick={() => { setContributeModalOpen(false); setSelectedGoal(null); }} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="size-5" />
              </button>
            </div>

            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              {contribData.type === 'withdrawal' ? 'Withdraw from' : 'Adding funds to'} <strong className="text-[var(--text)]">{selectedGoal.name}</strong>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-raised)] p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setContribData((prev) => ({ ...prev, type: 'deposit' }))}
                disabled={selectedGoal.status === 'completed'}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 ${contribData.type === 'deposit' ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs' : 'text-[var(--text-secondary)]'} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <ArrowDown className="size-3.5" /> Deposit
              </button>
              <button
                type="button"
                onClick={() => setContribData((prev) => ({ ...prev, type: 'withdrawal' }))}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 ${contribData.type === 'withdrawal' ? 'bg-[var(--surface)] text-rose-600 shadow-xs' : 'text-[var(--text-secondary)]'}`}
              >
                <ArrowUp className="size-3.5" /> Withdraw
              </button>
            </div>
            {contribData.type === 'withdrawal' && (
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">Available to withdraw: {formatAmount(selectedGoal.currentAmount, selectedGoal.currency)}</p>
            )}

            <form onSubmit={handleContribute} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[var(--text)] mb-1">{contribData.type === 'withdrawal' ? 'Withdrawal Amount' : 'Deposit Amount'}</label>
                <input
                  type="number"
                  min={currencyMinorStep(selectedGoal.currency)}
                  max={contribData.type === 'withdrawal' ? Number(selectedGoal.currentAmount || 0) : undefined}
                  step={currencyMinorStep(selectedGoal.currency)}
                  required
                  value={contribData.amount}
                  onChange={(e) => setContribData((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={contribData.notes}
                  onChange={(e) => setContribData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Monthly savings allocation"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setContributeModalOpen(false); setSelectedGoal(null); }}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Recording...' : (contribData.type === 'withdrawal' ? 'Record Withdrawal' : 'Record Deposit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
