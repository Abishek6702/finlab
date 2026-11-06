import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { budgetApi, categoryApi, accountApi } from '../../api/apiClient';
import { currencyStep, formatCurrencyAmount } from '../../moneyUtils';

export default function BudgetsView({ initialTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'overall',
    categoryId: '',
    amount: '',
    currency: 'USD',
    period: 'monthly',
    rolloverEnabled: false,
  });

  const loadBudgets = () => {
    Promise.all([
      budgetApi.getAll(),
      categoryApi.getAll({ type: 'expense' }),
      accountApi.getAll(),
    ])
      .then(([bRes, cRes, aRes]) => {
        if (bRes.data?.success) {
          const list = Array.isArray(bRes.data.data) ? bRes.data.data : [];
          setBudgets(list);
        }
        if (cRes.data?.success) {
          setCategories(cRes.data.data || []);
        }
        if (aRes.data?.success && aRes.data.data.length > 0) {
          const cur = aRes.data.data[0].currency || 'USD';
          setDefaultCurrency(cur);
          setFormData((prev) => ({
            ...prev,
            currency: prev.currency === 'USD' ? cur : prev.currency,
          }));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  const openCreateModal = () => {
    setEditingBudget(null);
    setFormData({
      name: '',
      type: 'overall',
      categoryId: '',
      amount: '',
      currency: defaultCurrency,
      period: 'monthly',
      rolloverEnabled: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (budget) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name || '',
      type: budget.type || 'overall',
      categoryId: budget.categoryId?._id || budget.categoryId || '',
      amount: String(budget.amount ?? ''),
      currency: budget.currency || defaultCurrency,
      period: budget.period || 'monthly',
      rolloverEnabled: Boolean(budget.rolloverEnabled),
    });
    setModalOpen(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        categoryId: formData.type === 'category' ? formData.categoryId : undefined,
      };
      if (editingBudget) await budgetApi.update(editingBudget._id, payload);
      else await budgetApi.create(payload);
      setModalOpen(false);
      setEditingBudget(null);
      setFormData({
        name: '',
        type: 'overall',
        categoryId: '',
        amount: '',
        currency: defaultCurrency,
        period: 'monthly',
        rolloverEnabled: false,
      });
      loadBudgets();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${editingBudget ? 'update' : 'create'} budget`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    try {
      await budgetApi.delete(id);
      loadBudgets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete budget');
    }
  };

  const filteredBudgets = budgets.filter((b) => {
    if (activeTab === 'overall') return b.type === 'overall';
    if (activeTab === 'category') return b.type === 'category';
    return true;
  });

  const tabs = [
    { id: 'overview', label: 'All Budgets' },
    { id: 'overall', label: 'Overall Budgets' },
    { id: 'category', label: 'Category Budgets' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Budgets</h2>
          <p className="text-xs text-[var(--text-secondary)]">Plan spending limits and track real-time utilization</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
        >
          <Plus className="size-4" />
          Create Budget
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] pb-2 text-xs font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 transition ${
              activeTab === tab.id
                ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-semibold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Budget Cards Grid */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <RefreshCw className="size-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : filteredBudgets.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBudgets.map((b) => {
            const spentNum = Number(b.currentSpent ?? b.spent ?? 0);
            const limitNum = Number(b.amount ?? 0);
            const remainingNum = Number(b.remaining ?? (limitNum - spentNum));
            const pct = Number(b.percentUsed ?? (limitNum > 0 ? Math.round((spentNum / limitNum) * 100) : 0));
            const isOver = Boolean(b.isOverBudget ?? b.isOverspent ?? (pct >= 100));
            const isWarn = pct >= 75 && !isOver;

            return (
              <div
                key={b._id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text)]">{b.name}</h4>
                      <p className="text-[11px] text-[var(--text-muted)] capitalize">
                        {b.period} • {b.type === 'category' ? b.categoryId?.name || 'Category' : 'Overall Spending'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        aria-label={`Edit ${b.name} budget`}
                        title="Edit budget"
                        className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBudget(b._id)}
                        aria-label={`Delete ${b.name} budget`}
                        title="Delete budget"
                        className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-rose-500/10 hover:text-rose-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text)]">{pct}% spent</span>
                      <span className={isOver ? 'text-rose-600 font-bold' : 'text-[var(--text-muted)]'}>
                        {isOver ? 'Over budget!' : `${b.currency || 'USD'} ${formatCurrencyAmount(remainingNum, b.currency)} left`}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Numbers */}
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)]">Spent</div>
                      <div className="font-mono font-bold text-[var(--text)]">
                        {b.currency || 'USD'} {formatCurrencyAmount(spentNum, b.currency)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[var(--text-muted)]">Limit</div>
                      <div className="font-mono font-bold text-[var(--text)]">
                        {b.currency || 'USD'} {formatCurrencyAmount(limitNum, b.currency)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="mt-4 flex items-center gap-1.5 text-[11px]">
                  {isOver ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                      <AlertTriangle className="size-3.5" />
                      Over limit
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                      <CheckCircle2 className="size-3.5" />
                      Within target
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-[var(--text-secondary)]">
          <p className="font-semibold">No budgets configured</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Create an overall or category budget to track spending against limits.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white"
          >
            Create First Budget
          </button>
        </div>
      )}

      {/* Create / Edit Budget Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-[var(--text)]">{editingBudget ? 'Edit Budget' : 'Create Budget'}</h3>
              <button type="button" onClick={() => { setModalOpen(false); setEditingBudget(null); }} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Budget Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Monthly Groceries, Total Monthly Spend"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Budget Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      type: e.target.value,
                      categoryId: e.target.value === 'category' ? prev.categoryId : '',
                    }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="overall">Overall Total</option>
                    <option value="category">Category-specific</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Period</label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData((prev) => ({ ...prev, period: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    {formData.period === 'custom' && <option value="custom">Custom period</option>}
                  </select>
                </div>
              </div>

              {formData.type === 'category' && (
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Category</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="">Select Expense Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Limit Amount</label>
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
                  <label className="block font-medium text-[var(--text)] mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                    disabled={Boolean(editingBudget)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="budgetRollover"
                  checked={formData.rolloverEnabled}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rolloverEnabled: e.target.checked }))}
                  className="mt-0.5 rounded border-[var(--border)]"
                />
                <label htmlFor="budgetRollover" className="text-xs text-[var(--text-secondary)]">
                  Carry unused budget into the next period
                </label>
              </div>
              {editingBudget && (
                <div className="space-y-1 text-[11px] text-[var(--text-muted)]">
                  <p>Currency is fixed so editing won’t reinterpret the existing limit.</p>
                  {editingBudget.period !== formData.period && formData.period !== 'custom' && (
                    <p>Changing the period resets this budget’s tracking window to the current {formData.period}.</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setEditingBudget(null); }}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                >
                  {actionLoading ? (editingBudget ? 'Saving...' : 'Creating...') : (editingBudget ? 'Save Changes' : 'Create Budget')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
