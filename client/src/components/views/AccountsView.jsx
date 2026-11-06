import { useState, useEffect } from 'react';
import { 
  Archive, 
  Plus, 
  RefreshCw, 
  Sliders, 
  X 
} from 'lucide-react';
import { accountApi } from '../../api/apiClient';
import { currencyStep, formatCurrencyAmount } from '../../moneyUtils';

export default function AccountsView({ initialTab = 'all' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New Account Form
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    currency: 'USD',
    openingBalance: '0.00',
    description: '',
    color: '#3B82F6',
    isDefault: false,
  });

  // Balance Adjustment Form
  const [adjustData, setAdjustData] = useState({
    newActualBalance: '',
    reason: '',
  });

  const loadAccounts = (tab) => {
    const isArchived = tab === 'archived';
    const params = {
      isArchived: isArchived ? 'true' : 'false',
    };
    if (['cash', 'bank', 'credit_card'].includes(tab)) {
      params.type = tab;
    } else if (tab === 'upi_wallet') {
      params.type = 'upi';
    }

    accountApi.getAll(params)
      .then((res) => {
        if (res.data?.success) {
          setAccounts(res.data.data || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAccounts(activeTab);
  }, [activeTab]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await accountApi.create({
        ...formData,
        openingBalance: parseFloat(formData.openingBalance || 0),
      });
      setModalOpen(false);
      setFormData({
        name: '',
        type: 'bank',
        currency: 'USD',
        openingBalance: '0.00',
        description: '',
        color: '#3B82F6',
        isDefault: false,
      });
      loadAccounts(activeTab);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setActionLoading(true);
    try {
      await accountApi.adjustBalance(selectedAccount._id, {
        newBalance: parseFloat(adjustData.newActualBalance),
        reason: adjustData.reason,
      });
      setAdjustModalOpen(false);
      setSelectedAccount(null);
      setAdjustData({ newActualBalance: '', reason: '' });
      loadAccounts(activeTab);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to adjust balance');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleArchive = async (id) => {
    try {
      await accountApi.toggleArchive(id);
      loadAccounts(activeTab);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update archive state');
    }
  };

  const tabs = [
    { id: 'all', label: 'All Accounts' },
    { id: 'cash', label: 'Cash' },
    { id: 'bank', label: 'Bank Accounts' },
    { id: 'upi_wallet', label: 'UPI & Wallets' },
    { id: 'credit_card', label: 'Credit Cards' },
    { id: 'archived', label: 'Archived Accounts' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Accounts</h2>
          <p className="text-xs text-[var(--text-secondary)]">Manage your cash, bank accounts, UPI & credit cards</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
        >
          <Plus className="size-4" />
          Add Account
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] pb-2 text-xs font-semibold">
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

      {/* Account Cards Grid */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <RefreshCw className="size-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : accounts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => {
            const isCredit = acc.type === 'credit_card';
            return (
              <div
                key={acc._id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-3.5 rounded-full" style={{ backgroundColor: acc.color || '#3B82F6' }} />
                      <span className="text-sm font-bold text-[var(--text)]">{acc.name}</span>
                    </div>
                    <span className="rounded-md bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {acc.type.replace('_', ' ')}
                    </span>
                  </div>

                  {acc.description && (
                    <p className="mt-2 text-xs text-[var(--text-secondary)] line-clamp-2">
                      {acc.description}
                    </p>
                  )}

                  <div className="mt-4">
                    <div className="text-[11px] font-medium text-[var(--text-muted)]">
                      {isCredit ? 'Outstanding Liability' : 'Current Balance'}
                    </div>
                    <div className={`text-xl font-bold font-mono tracking-tight ${
                      isCredit ? 'text-amber-600' : 'text-[var(--text)]'
                    }`}>
                      {acc.currency} {formatCurrencyAmount(acc.currentBalance ?? acc.balance ?? 0, acc.currency)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
                  <button
                    onClick={() => {
                      setSelectedAccount(acc);
                      setAdjustData({ newActualBalance: String(acc.currentBalance ?? acc.balance ?? 0), reason: '' });
                      setAdjustModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[var(--primary)] font-semibold hover:underline"
                  >
                    <Sliders className="size-3.5" />
                    Adjust
                  </button>
                  <button
                    onClick={() => handleToggleArchive(acc._id)}
                    className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)] transition"
                  >
                    <Archive className="size-3.5" />
                    {acc.isArchived ? 'Restore' : 'Archive'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-[var(--text-secondary)]">
          <p className="font-semibold">No accounts found</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Create an account to track your assets and liabilities accurately.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white"
          >
            Add First Account
          </button>
        </div>
      )}

      {/* Add Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-[var(--text)]">Add Account</h3>
              <button onClick={() => setModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Chase Checking, HDFC Salary, Main Cash"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Account Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="bank">Bank Account</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="wallet">Wallet</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Opening Balance</label>
                <input
                  type="number"
                  step={currencyStep(formData.currency)}
                  value={formData.openingBalance}
                  onChange={(e) => setFormData((prev) => ({ ...prev, openingBalance: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Account purpose or notes"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {adjustModalOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-[var(--text)]">Adjust Account Balance</h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-3 text-xs text-[var(--text-secondary)]">
              Account: <strong className="text-[var(--text)]">{selectedAccount.name}</strong> • Current: <strong className="text-[var(--text)] font-mono">{selectedAccount.currency} {formatCurrencyAmount(selectedAccount.currentBalance ?? selectedAccount.balance ?? 0, selectedAccount.currency)}</strong>
            </div>

            <form onSubmit={handleAdjustBalance} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[var(--text)] mb-1">New Actual Balance</label>
                <input
                  type="number"
                  step={currencyStep(selectedAccount.currency)}
                  required
                  value={adjustData.newActualBalance}
                  onChange={(e) => setAdjustData((prev) => ({ ...prev, newActualBalance: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Reason / Note</label>
                <input
                  type="text"
                  required
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Monthly bank statement reconciliation"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
