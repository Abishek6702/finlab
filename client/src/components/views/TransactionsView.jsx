import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  Pencil,
  Plus, 
  RefreshCw, 
  RotateCcw, 
  Search, 
  Table2,
  Trash2, 
  X 
} from 'lucide-react';
import { transactionApi, accountApi, categoryApi } from '../../api/apiClient';
import { currencyStep, formatCurrencyAmount, majorUnitsFromMinor } from '../../moneyUtils';

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export default function TransactionsView({ initialTab = 'all' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [viewMode, setViewMode] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'grid' : 'table'
  ));
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [eligibleRefundTransactions, setEligibleRefundTransactions] = useState([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState(null);

  // Add Form State
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    accountId: '',
    destinationAccountId: '',
    destinationAmount: '',
    originalTransactionId: '',
    categoryId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'other',
    exchangeRate: '1.0',
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    amount: '',
    description: '',
    transactionDate: '',
    categoryId: '',
    paymentMethod: 'other',
  });

  useEffect(() => {
    const shouldAdd = searchParams.get('add') === '1';
    const typeParam = searchParams.get('type');
    if (!shouldAdd && !typeParam) return undefined;
    const timer = setTimeout(() => {
      if (typeParam && ['expense', 'income', 'transfer', 'refund'].includes(typeParam)) {
        setFormData((prev) => ({ ...prev, type: typeParam }));
      }
      setModalOpen(true);
      setMessage(null);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('add');
      nextParams.delete('type');
      setSearchParams(nextParams, { replace: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, setSearchParams]);

  const loadTransactions = useCallback((tab, searchVal, pageNum = 1, limitNum = 10) => {
    const isTrash = tab === 'trash';
    const params = {
      isDeleted: isTrash ? 'true' : 'false',
      page: pageNum,
      limit: limitNum,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    if (tab !== 'all' && tab !== 'trash') {
      params.type = tab;
    }
    if (searchVal && searchVal.trim()) {
      params.search = searchVal.trim();
    }

    Promise.all([
      transactionApi.getAll(params),
      accountApi.getAll(),
      categoryApi.getAll(),
    ])
      .then(([txRes, accRes, catRes]) => {
        if (txRes.data?.success) {
          // Backend returns data directly as array or as data.items
          const list = Array.isArray(txRes.data.data)
            ? txRes.data.data
            : (txRes.data.data?.items || []);
          setTransactions(list);

          const pag = txRes.data.pagination;
          if (pag) {
            setPagination({
              total: Number(pag.total ?? list.length),
              page: Number(pag.page ?? pageNum),
              limit: Number(pag.limit ?? limitNum),
              totalPages: Number(pag.totalPages ?? pag.pages ?? 1),
              hasNextPage: Boolean(pag.hasNextPage),
              hasPrevPage: Boolean(pag.hasPrevPage),
            });
          }
        }
        if (accRes.data?.success) {
          const accs = accRes.data.data || [];
          setAccounts(accs);
          if (accs.length > 0) {
            setFormData((prev) => prev.accountId ? prev : { ...prev, accountId: accs[0]._id });
          }
        }
        if (catRes.data?.success) {
          setCategories(catRes.data.data || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [setFormData]);

  useEffect(() => {
    loadTransactions(activeTab, submittedSearch, page, limit);
  }, [activeTab, submittedSearch, page, limit, loadTransactions]);

  useEffect(() => {
    if (!modalOpen || formData.type !== 'refund') return undefined;
    let active = true;
    transactionApi.getAll({ type: 'expense', isDeleted: 'false', limit: 1000 })
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.items || []);
        setEligibleRefundTransactions(list.filter((tx) => Number(tx.totalRefunded || 0) < Number(tx.amount || 0)));
      })
      .catch((err) => {
        if (active) setRefundError(err.response?.data?.message || 'Unable to load eligible expenses for refund');
      })
      .finally(() => {
        if (active) setRefundLoading(false);
      });
    return () => { active = false; };
  }, [modalOpen, formData.type]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSubmittedSearch(search);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === page) return;
    setPage(newPage);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const selectedAcc = accounts.find((a) => a._id === formData.accountId);
      const selectedDestination = accounts.find((a) => a._id === formData.destinationAccountId);
      const isCrossCurrencyTransfer = formData.type === 'transfer'
        && selectedAcc?.currency !== selectedDestination?.currency;
      if (isCrossCurrencyTransfer && !(Number(formData.destinationAmount) > 0)) {
        setMessage({ type: 'error', text: 'Enter the amount that will be credited in the destination currency.' });
        setActionLoading(false);
        return;
      }
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        currency: selectedAcc?.currency || 'USD',
        destinationAmount: isCrossCurrencyTransfer ? parseFloat(formData.destinationAmount) : undefined,
        exchangeRate: isCrossCurrencyTransfer
          ? Number(formData.destinationAmount) / Number(formData.amount)
          : 1,
        originalTransactionId: formData.type === 'refund' ? formData.originalTransactionId : undefined,
      };
      if (payload.type === 'transfer' && !payload.destinationAccountId) {
        alert('Please choose a destination account for transfer.');
        setActionLoading(false);
        return;
      }

      await transactionApi.create(payload);
      setModalOpen(false);
      setFormData({
        type: 'expense',
        amount: '',
        accountId: accounts[0]?._id || '',
        destinationAccountId: '',
        destinationAmount: '',
        originalTransactionId: '',
        categoryId: '',
        transactionDate: new Date().toISOString().split('T')[0],
        description: '',
        paymentMethod: 'other',
        exchangeRate: '1.0',
      });
      setPage(1);
      loadTransactions(activeTab, submittedSearch, 1, limit);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Transaction creation failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    const dateStr = tx.transactionDate ? new Date(tx.transactionDate).toISOString().split('T')[0] : '';
    setEditFormData({
      amount: String(tx.amount || ''),
      description: tx.description || '',
      transactionDate: dateStr,
      categoryId: tx.categoryId?._id || tx.categoryId || '',
      paymentMethod: tx.paymentMethod || 'other',
    });
    setEditModalOpen(true);
    setMessage(null);
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    if (!editingTx) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const payload = {
        amount: parseFloat(editFormData.amount),
        description: editFormData.description,
        transactionDate: editFormData.transactionDate,
        categoryId: editFormData.categoryId || undefined,
        paymentMethod: editFormData.paymentMethod,
      };

      await transactionApi.update(editingTx._id, payload);
      setEditModalOpen(false);
      setEditingTx(null);
      loadTransactions(activeTab, submittedSearch, page, limit);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update transaction' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSoftDelete = async (id) => {
    if (!window.confirm('Move this transaction to Trash?')) return;
    try {
      await transactionApi.softDelete(id);
      loadTransactions(activeTab, submittedSearch, page, limit);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete transaction');
    }
  };

  const handleRestore = async (id) => {
    try {
      await transactionApi.restore(id);
      loadTransactions(activeTab, submittedSearch, page, limit);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to restore transaction');
    }
  };

  const tabs = [
    { id: 'all', label: 'All Transactions' },
    { id: 'income', label: 'Income' },
    { id: 'expense', label: 'Expenses' },
    { id: 'transfer', label: 'Transfers' },
    { id: 'refund', label: 'Refunds' },
    { id: 'trash', label: 'Trash' },
  ];

  const filteredCategories = categories.filter((c) => {
    if (formData.type === 'income') return c.type === 'income';
    if (formData.type === 'expense' || formData.type === 'refund') return c.type === 'expense';
    return true;
  });
  const selectedRefundExpense = eligibleRefundTransactions.find((tx) => tx._id === formData.originalTransactionId);
  const selectableAccounts = formData.type === 'refund' && selectedRefundExpense
    ? accounts.filter((account) => account.currency === selectedRefundExpense.currency)
    : accounts;
  const sourceCurrency = accounts.find((account) => account._id === formData.accountId)?.currency || 'USD';
  const destinationCurrency = accounts.find((account) => account._id === formData.destinationAccountId)?.currency;
  const crossCurrencyTransfer = formData.type === 'transfer' && destinationCurrency && sourceCurrency !== destinationCurrency;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Transactions</h2>
          <p className="text-xs text-[var(--text-secondary)]">Manage your complete financial ledger</p>
        </div>
        <button
          onClick={() => {
            if (formData.type === 'refund') {
              setRefundLoading(true);
              setRefundError(null);
              setEligibleRefundTransactions([]);
            }
            setModalOpen(true);
            setMessage(null);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
        >
          <Plus className="size-4" />
          Add Transaction
        </button>
      </div>

      {/* Tabs */}
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain border-b border-[var(--border)] pb-2 text-xs font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 transition ${
              activeTab === tab.id
                ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-semibold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description, notes or tags..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-xs focus:border-[var(--primary)] focus:outline-none"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div role="group" aria-label="Transaction view" className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${viewMode === 'grid' ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'}`}
            >
              <LayoutGrid className="size-3.5" /> Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              aria-pressed={viewMode === 'table'}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${viewMode === 'table' ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'}`}
            >
              <Table2 className="size-3.5" /> Table
            </button>
          </div>
          <button
            onClick={() => loadTransactions(activeTab, submittedSearch, page, limit)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className={viewMode === 'grid' ? 'space-y-3' : 'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs'}>
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <RefreshCw className="size-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : transactions.length > 0 ? (
          viewMode === 'grid' ? (
            <div className={`grid grid-cols-1 gap-3 ${transactions.length === 1 ? 'max-w-xl' : transactions.length === 2 ? 'max-w-4xl sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
              {transactions.map((tx) => {
                const isIncome = tx.type === 'income';
                const isRefund = tx.type === 'refund';
                const isTransfer = tx.type === 'transfer';
                const txAmount = tx.amount ?? majorUnitsFromMinor(tx.amountMinor, tx.currency);
                return (
                  <article key={tx._id} className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text)]">{tx.description || 'No description'}</p>
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">{new Date(tx.transactionDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isIncome ? 'bg-emerald-500/10 text-emerald-600' : isRefund ? 'bg-sky-500/10 text-sky-600' : isTransfer ? 'bg-indigo-500/10 text-indigo-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>{tx.type}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <p className={`min-w-0 break-words font-mono text-base font-bold ${
                        isIncome ? 'text-emerald-600' : isRefund ? 'text-sky-600' : isTransfer ? 'text-indigo-600' : 'text-[var(--text)]'
                      }`}>
                        {isIncome || isRefund ? '+' : isTransfer ? '' : '−'}{tx.currency} {formatCurrencyAmount(txAmount, tx.currency)}
                      </p>
                      <span className="flex shrink-0 items-center gap-0.5">
                        {activeTab === 'trash' ? (
                          <button type="button" onClick={() => handleRestore(tx._id)} aria-label={`Restore ${tx.description || 'transaction'}`} title="Restore transaction" className="grid size-7 place-items-center rounded-md text-emerald-600 transition hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                            <RotateCcw className="size-3.5" />
                          </button>
                        ) : (
                          <>
                            <button type="button" onClick={() => handleOpenEdit(tx)} aria-label={`Edit ${tx.description || 'transaction'}`} title="Edit transaction" className="grid size-7 place-items-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
                              <Pencil className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => handleSoftDelete(tx._id)} aria-label={`Delete ${tx.description || 'transaction'}`} title="Move to trash" className="grid size-7 place-items-center rounded-md text-[var(--text-muted)] transition hover:bg-rose-500/10 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3 text-[11px]">
                      <div className="min-w-0">
                        <dt className="text-[var(--text-muted)]">Account</dt>
                        <dd className="mt-0.5 truncate font-medium text-[var(--text)]">
                          {tx.accountId?.name || 'Account'}{isTransfer && tx.destinationAccountId ? ` → ${tx.destinationAccountId.name}` : ''}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[var(--text-muted)]">Category</dt>
                        <dd className="mt-0.5 truncate font-medium text-[var(--text)]">{tx.categoryId?.name || (isTransfer ? 'Transfer' : 'Uncategorized')}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-raised)] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {transactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isRefund = tx.type === 'refund';
                  const isTransfer = tx.type === 'transfer';
                  const txAmount = tx.amount ?? majorUnitsFromMinor(tx.amountMinor, tx.currency);

                  return (
                    <tr key={tx._id} className="transition hover:bg-[var(--surface-raised)]/40">
                      <td className="py-3 px-4 whitespace-nowrap text-[var(--text-secondary)]">
                        {new Date(tx.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isIncome ? 'bg-emerald-500/10 text-emerald-600' :
                          isRefund ? 'bg-sky-500/10 text-sky-600' :
                          isTransfer ? 'bg-indigo-500/10 text-indigo-600' :
                          'bg-rose-500/10 text-rose-600'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-[var(--text)]">
                        {tx.accountId?.name || 'Account'}
                        {isTransfer && tx.destinationAccountId && (
                          <span className="text-[var(--text-muted)] font-normal"> &rarr; {tx.destinationAccountId.name}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[var(--text-secondary)]">
                        {tx.categoryId?.name || (isTransfer ? 'Transfer' : 'Uncategorized')}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-[var(--text)]">
                        {tx.description || '—'}
                      </td>
                      <td className={`py-3 px-4 whitespace-nowrap text-right font-mono font-bold ${
                        isIncome ? 'text-emerald-600' :
                        isRefund ? 'text-sky-600' :
                        isTransfer ? 'text-indigo-600' :
                        'text-[var(--text)]'
                      }`}>
                        {isIncome ? '+' : isRefund ? '+' : isTransfer ? '' : '−'}{tx.currency} {formatCurrencyAmount(txAmount, tx.currency)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        {activeTab === 'trash' ? (
                          <button
                            onClick={() => handleRestore(tx._id)}
                            title="Restore transaction"
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/10 transition"
                          >
                            <RotateCcw className="size-3.5" />
                            Restore
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              title="Edit transaction"
                              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--primary)] transition"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleSoftDelete(tx._id)}
                              title="Delete transaction"
                              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-600 transition"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-16 text-center text-sm text-[var(--text-secondary)]">
            <p className="font-semibold">No transactions found</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {activeTab === 'trash' ? 'Trash is currently empty.' : 'Try adjusting your search filter or add a new transaction.'}
            </p>
          </div>
        )}

        {/* Pagination Bar */}
        {transactions.length > 0 && (
          <div className={`flex flex-col items-center justify-between gap-3 px-4 py-3 text-xs text-[var(--text-secondary)] sm:flex-row sm:px-6 ${viewMode === 'grid' ? 'rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs' : 'border-t border-[var(--border)]'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Showing <span className="font-semibold text-[var(--text)]">{pagination.total > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
                <span className="font-semibold text-[var(--text)]">{Math.min(page * limit, pagination.total)}</span> of{' '}
                <span className="font-semibold text-[var(--text)]">{pagination.total}</span> entries
              </span>
              <span className="text-[var(--border)] hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline">Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  aria-label="Rows per page"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1">
              {/* First Page Quick Jump (visible when > 5 pages) */}
              {pagination.totalPages > 5 && (
                <button
                  type="button"
                  title="First page"
                  disabled={page <= 1 || loading}
                  onClick={() => handlePageChange(1)}
                  className="hidden sm:inline-flex size-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-raised)] transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="size-3.5" />
                </button>
              )}

              {/* Previous Button */}
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => handlePageChange(page - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-raised)] transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-3.5" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Mobile compact page indicator */}
              <span className="sm:hidden px-2 text-xs font-semibold text-[var(--text)]">
                {page} / {pagination.totalPages}
              </span>

              {/* Desktop Pill Numbers (with smart truncation for 5+ pages) */}
              <div className="hidden sm:flex items-center gap-1">
                {getVisiblePages(page, pagination.totalPages).map((item, idx) => {
                  if (item === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-1.5 text-xs font-bold text-[var(--text-muted)] select-none">
                        …
                      </span>
                    );
                  }
                  const isCurrent = item === page;
                  return (
                    <button
                      key={`page-${item}`}
                      type="button"
                      onClick={() => handlePageChange(item)}
                      className={`size-7 rounded-lg text-xs font-semibold transition ${
                        isCurrent
                          ? 'bg-[var(--primary)] text-white shadow-xs font-bold'
                          : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-raised)]'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                type="button"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => handlePageChange(page + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-raised)] transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="size-3.5" />
              </button>

              {/* Last Page Quick Jump (visible when > 5 pages) */}
              {pagination.totalPages > 5 && (
                <button
                  type="button"
                  title="Last page"
                  disabled={page >= pagination.totalPages || loading}
                  onClick={() => handlePageChange(pagination.totalPages)}
                  className="hidden sm:inline-flex size-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-raised)] transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-[var(--text)]">Add Transaction</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <X className="size-5" />
              </button>
            </div>

            {message && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600">
                {message.text}
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="mt-4 space-y-4 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-[var(--surface-raised)] p-1 font-semibold">
                {['expense', 'income', 'transfer', 'refund'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (t === 'refund') {
                        setRefundLoading(true);
                        setRefundError(null);
                        setEligibleRefundTransactions([]);
                      }
                      setFormData((prev) => ({ ...prev, type: t }));
                    }}
                    className={`rounded-lg py-2 capitalize transition ${
                      formData.type === t ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {formData.type === 'refund' && (
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Original Expense</label>
                  <select
                    required
                    value={formData.originalTransactionId}
                    onChange={(e) => {
                      const expense = eligibleRefundTransactions.find((tx) => tx._id === e.target.value);
                      const matchingAccount = expense && accounts.find((account) => account.currency === expense.currency);
                      setFormData((prev) => ({
                        ...prev,
                        originalTransactionId: e.target.value,
                        accountId: matchingAccount?._id || prev.accountId,
                        categoryId: expense?.categoryId?._id || expense?.categoryId || '',
                      }));
                    }}
                    disabled={refundLoading || eligibleRefundTransactions.length === 0}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none disabled:opacity-60"
                  >
                    <option value="">{refundLoading ? 'Loading expenses…' : 'Select an unrefunded expense'}</option>
                    {eligibleRefundTransactions.map((tx) => {
                      const remaining = Number(tx.amount || 0) - Number(tx.totalRefunded || 0);
                      return (
                        <option key={tx._id} value={tx._id}>
                          {tx.description || 'Expense'} · {tx.currency} {formatCurrencyAmount(remaining, tx.currency)} remaining
                        </option>
                      );
                    })}
                  </select>
                  {refundError && <p className="mt-1 text-[11px] text-rose-600">{refundError}</p>}
                  {!refundLoading && !refundError && eligibleRefundTransactions.length === 0 && (
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">No eligible expenses are available for a refund.</p>
                  )}
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Amount</label>
                  <input
                    type="number"
                    min={currencyStep(sourceCurrency)}
                    step={currencyStep(sourceCurrency)}
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.transactionDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, transactionDate: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Account Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">
                    {formData.type === 'transfer' ? 'Source Account' : 'Account'}
                  </label>
                  <select
                    required
                    value={formData.accountId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, accountId: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    {selectableAccounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </select>
                </div>

                {formData.type === 'transfer' ? (
                  <div>
                    <label className="block font-medium text-[var(--text)] mb-1">Destination Account</label>
                    <select
                      required
                      value={formData.destinationAccountId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, destinationAccountId: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    >
                      <option value="">Select Destination</option>
                      {accounts.filter((a) => a._id !== formData.accountId).map((acc) => (
                        <option key={acc._id} value={acc._id}>
                          {acc.name} ({acc.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-[var(--text)] mb-1">Category</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {filteredCategories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {crossCurrencyTransfer && (
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">
                    Amount received ({destinationCurrency})
                  </label>
                  <input
                    type="number"
                    min={currencyStep(destinationCurrency)}
                    step={currencyStep(destinationCurrency)}
                    required
                    value={formData.destinationAmount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, destinationAmount: e.target.value }))}
                    placeholder={`0 (${destinationCurrency})`}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    Enter the actual credited amount. FinLab does not fetch an exchange rate.
                  </p>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Grocery shopping, Client invoice, Dinner"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editModalOpen && editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text)]">Edit Transaction</h3>
                <p className="text-[11px] text-[var(--text-muted)] capitalize">
                  {editingTx.type} • {editingTx.accountId?.name || 'Account'} ({editingTx.currency})
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <X className="size-5" />
              </button>
            </div>

            {message && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600">
                {message.text}
              </div>
            )}

            <form onSubmit={handleUpdateTransaction} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Amount</label>
                  <input
                    type="number"
                    min={currencyStep(editingTx.currency)}
                    step={currencyStep(editingTx.currency)}
                    required
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-mono text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editFormData.transactionDate}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, transactionDate: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
              </div>

              {editingTx.type !== 'transfer' && (
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1">Category</label>
                  <select
                    value={editFormData.categoryId}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Description</label>
                <input
                  type="text"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Grocery shopping, Client invoice, Dinner"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
