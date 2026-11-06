import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Download,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { reportApi } from '../../api/apiClient';
import { formatCurrencyAmount } from '../../moneyUtils';

const periodOptions = [
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'last_90_days', label: 'Last 90 days' },
  { id: 'last_6_months', label: 'Last 6 months' },
  { id: 'year_to_date', label: 'Year to date' },
  { id: 'all_time', label: 'All time' },
];

const reportTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'income_expenses', label: 'Income & Expenses' },
  { id: 'category', label: 'Category Analysis' },
  { id: 'cash_flow', label: 'Cash Flow' },
  { id: 'export', label: 'Export' },
];

function dateParam(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRangeParams(period) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let end = new Date(start);

  if (period === 'this_month') {
    start.setDate(1);
  } else if (period === 'last_month') {
    start.setDate(1);
    start.setMonth(start.getMonth() - 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
  } else if (period === 'last_90_days') {
    start.setDate(start.getDate() - 89);
  } else if (period === 'last_6_months') {
    start.setDate(1);
    start.setMonth(start.getMonth() - 5);
  } else if (period === 'year_to_date') {
    start.setMonth(0, 1);
  } else {
    return {};
  }

  return { startDate: dateParam(start), endDate: dateParam(end) };
}

function monthLabel(period) {
  const date = new Date(`${period}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? period
    : new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' }).format(date);
}

export default function ReportsView({ initialTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [period, setPeriod] = useState('last_6_months');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const rangeParams = useMemo(() => getRangeParams(period), [period]);

  const fetchReports = useCallback(() => Promise.all([
    reportApi.getSummary(rangeParams),
    reportApi.getCategoryAnalysis({ ...rangeParams, type: 'expense' }),
    reportApi.getCashFlow(rangeParams),
  ]), [rangeParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    fetchReports()
      .then(([summaryResponse, categoryResponse, cashFlowResponse]) => {
        if (!active) return;
        if (summaryResponse.data?.success) setSummary(summaryResponse.data.data);
        if (categoryResponse.data?.success) setCategoryData(categoryResponse.data.data.categories || []);
        if (cashFlowResponse.data?.success) setCashFlow(cashFlowResponse.data.data || []);
      })
      .catch((error) => {
        if (active) setLoadError(error.response?.data?.message || 'Unable to load reports. Try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [fetchReports, reloadKey]);

  const currencyOptions = useMemo(
    () => Object.keys(summary?.summaryByCurrency || {}).sort(),
    [summary]
  );
  const activeCurrency = currencyOptions.includes(selectedCurrency)
    ? selectedCurrency
    : currencyOptions[0] || '';
  const currencySummary = summary?.summaryByCurrency?.[activeCurrency] || {
    income: 0,
    expense: 0,
    refunds: 0,
    netExpenses: 0,
    netSavings: 0,
    savingsRate: 0,
    transactionCount: 0,
  };
  const selectedCategories = categoryData
    .filter((category) => category.currency === activeCurrency)
    .slice()
    .sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
  const selectedCashFlow = cashFlow
    .filter((entry) => entry.currency === activeCurrency)
    .slice()
    .sort((a, b) => a.period.localeCompare(b.period));
  const maxMonthlyValue = Math.max(
    1,
    ...selectedCashFlow.flatMap((entry) => [Number(entry.income) || 0, Number(entry.expense) || 0])
  );

  const formatMoney = (amount, currency = activeCurrency || 'USD') =>
    `${currency} ${formatCurrencyAmount(Number(amount) || 0, currency)}`;

  const handleExportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const params = activeCurrency ? { ...rangeParams, currency: activeCurrency } : rangeParams;
      const response = await reportApi.exportCsv(params);
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'finlab_transactions.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(error.response?.data?.message || 'Unable to export transactions. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const tabs = reportTabs;
  const metrics = [
    {
      label: 'Income',
      value: formatMoney(currencySummary.income),
      detail: 'Money received in this period',
      icon: ArrowDownLeft,
      valueClass: 'text-emerald-600',
      iconClass: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      label: 'Net spending',
      value: formatMoney(currencySummary.netExpenses),
      detail: `${formatMoney(currencySummary.refunds)} returned as refunds`,
      icon: ArrowUpRight,
      valueClass: 'text-[var(--text)]',
      iconClass: 'bg-rose-500/10 text-rose-600',
    },
    {
      label: 'Net savings',
      value: formatMoney(currencySummary.netSavings),
      detail: 'Income less net spending',
      icon: TrendingUp,
      valueClass: Number(currencySummary.netSavings) >= 0 ? 'text-sky-600' : 'text-rose-600',
      iconClass: 'bg-sky-500/10 text-sky-600',
    },
    {
      label: 'Savings rate',
      value: `${Number(currencySummary.savingsRate) || 0}%`,
      detail: `${Number(currencySummary.transactionCount) || 0} transactions recorded`,
      icon: Wallet,
      valueClass: 'text-[var(--text)]',
      iconClass: 'bg-[var(--primary-soft)] text-[var(--primary)]',
    },
  ];

  const cashFlowChart = (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--text)]">Income and spending trend</h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Monthly totals in {activeCurrency || 'your selected currency'}; transfers are excluded.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[var(--primary)]" /> Income</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-rose-500/70" /> Net spending</span>
        </div>
      </div>

      {selectedCashFlow.length ? (
        <div className="mt-6 overflow-x-auto pb-2">
          <div
            role="img"
            aria-label={`Income and net spending by month for ${activeCurrency}`}
            className="grid min-w-[520px] items-end gap-3 border-b border-[var(--border)] px-2 sm:min-w-0 sm:gap-4"
            style={{ gridTemplateColumns: `repeat(${selectedCashFlow.length}, minmax(48px, 1fr))` }}
          >
            {selectedCashFlow.map((entry) => {
              const income = Number(entry.income) || 0;
              const expenses = Number(entry.expense) || 0;
              const incomeHeight = income > 0 ? Math.max(4, (income / maxMonthlyValue) * 100) : 0;
              const expenseHeight = expenses > 0 ? Math.max(4, (expenses / maxMonthlyValue) * 100) : 0;
              return (
                <div key={`${entry.period}:${entry.currency}`} className="flex min-w-0 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center gap-1.5 border-b border-dashed border-[var(--border)]">
                    <div
                      title={`Income: ${formatMoney(income)}`}
                      className="w-3.5 rounded-t-md bg-[var(--primary)] transition-all sm:w-5"
                      style={{ height: `${incomeHeight}%` }}
                    />
                    <div
                      title={`Net spending: ${formatMoney(expenses)}`}
                      className="w-3.5 rounded-t-md bg-rose-500/70 transition-all sm:w-5"
                      style={{ height: `${expenseHeight}%` }}
                    />
                  </div>
                  <span className="whitespace-nowrap pb-1 text-[10px] text-[var(--text-muted)]">{monthLabel(entry.period)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-5 grid min-h-40 place-items-center rounded-xl bg-[var(--surface-raised)]/60 px-4 text-center">
          <div>
            <ChartNoAxesCombined className="mx-auto size-7 text-[var(--text-muted)]" />
            <p className="mt-2 text-xs font-semibold text-[var(--text-secondary)]">No monthly activity for this period</p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">Once transactions are recorded, the income and spending trend will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );

  const categoryPanel = (limit = selectedCategories.length) => (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--text)]">Spending by category</h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Expense breakdown for {activeCurrency || 'the selected currency'}.</p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--surface-raised)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
          {selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'}
        </span>
      </div>

      {selectedCategories.length ? (
        <div className="space-y-4">
          {selectedCategories.slice(0, limit).map((category) => {
            const share = Math.max(0, Math.min(100, Number(category.percentage) || 0));
            return (
              <div key={`${category.currency}:${category.categoryId}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color || '#64748B' }} />
                    <span className="truncate font-semibold text-[var(--text)]">{category.name}</span>
                    <span className="hidden shrink-0 text-[10px] text-[var(--text-muted)] sm:inline">{category.count} tx</span>
                  </div>
                  <span className="shrink-0 font-mono font-semibold text-[var(--text)]">{formatMoney(category.total, category.currency)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-raised)]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${share}%`, backgroundColor: category.color || 'var(--primary)' }} />
                </div>
                <div className="text-right text-[10px] text-[var(--text-muted)]">{share}% of expenses</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-36 place-items-center rounded-xl bg-[var(--surface-raised)]/60 px-4 text-center text-xs text-[var(--text-muted)]">
          No categorized expenses in this period.
        </div>
      )}
    </section>
  );

  const cashFlowTable = (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
      <table className="w-full min-w-[590px] text-left text-xs">
        <thead className="border-b border-[var(--border)] bg-[var(--surface-raised)] text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Month</th>
            <th className="px-4 py-3 text-right">Income</th>
            <th className="px-4 py-3 text-right">Net spending</th>
            <th className="px-4 py-3 text-right">Net cash flow</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {selectedCashFlow.slice().reverse().map((entry) => (
            <tr key={`${entry.period}:${entry.currency}`} className="hover:bg-[var(--surface-raised)]/40">
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--text)]">{monthLabel(entry.period)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-emerald-600">+{formatMoney(entry.income, entry.currency)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-rose-600">−{formatMoney(entry.expense, entry.currency)}</td>
              <td className={`whitespace-nowrap px-4 py-3 text-right font-mono font-bold ${Number(entry.netFlow) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {Number(entry.netFlow) >= 0 ? '+' : '−'}{formatMoney(Math.abs(Number(entry.netFlow) || 0), entry.currency)}
              </td>
            </tr>
          ))}
          {!selectedCashFlow.length && (
            <tr><td colSpan={4} className="px-4 py-10 text-center text-xs text-[var(--text-muted)]">No cash flow activity to show for this period.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            <ChartNoAxesCombined className="size-3.5 text-[var(--primary)]" /> Financial insights
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)] sm:text-2xl">Reports & Analytics</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">Understand where your money comes from, where it goes, and how your cash flow changes over time.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
          <label className="min-w-0 text-[10px] font-semibold text-[var(--text-secondary)]">
            Reporting period
            <span className="relative mt-1 block">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
              <select value={period} onChange={(event) => setPeriod(event.target.value)} className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-8 text-xs font-medium text-[var(--text)] outline-none focus:border-[var(--primary)] sm:w-40">
                {periodOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </span>
          </label>
          <label className="min-w-0 text-[10px] font-semibold text-[var(--text-secondary)]">
            Currency
            <span className="relative mt-1 block">
              <select value={activeCurrency} onChange={(event) => setSelectedCurrency(event.target.value)} disabled={!currencyOptions.length} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-medium text-[var(--text)] outline-none focus:border-[var(--primary)] disabled:opacity-60 sm:w-28">
                {currencyOptions.length ? currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>) : <option value="">—</option>}
              </select>
            </span>
          </label>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-raised)] disabled:opacity-60">
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> <span className="sm:hidden">Refresh</span>
          </button>
          <button type="button" onClick={handleExportCsv} disabled={exporting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95 disabled:opacity-60">
            <Download className="size-3.5" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {exportError && (
        <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600">{exportError}</p>
      )}

      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain border-b border-[var(--border)] pb-2 text-xs font-semibold">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 transition ${activeTab === tab.id ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="text-center"><RefreshCw className="mx-auto size-6 animate-spin text-[var(--primary)]" /><p className="mt-3 text-xs text-[var(--text-secondary)]">Preparing your reports…</p></div>
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
          <p className="text-sm font-semibold text-rose-600">We couldn’t load these reports</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{loadError}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white">Try again</button>
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          {summary?.totalTransactions === 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-xs text-[var(--text-secondary)]">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-sky-600" />
              <p>No transactions were recorded for this period. Choose another period or add transactions to see your financial trends.</p>
            </div>
          )}

          {(activeTab === 'overview' || activeTab === 'income_expenses') && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <article key={metric.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-[var(--text-secondary)]">{metric.label}</p>
                        <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${metric.iconClass}`}><Icon className="size-4" /></span>
                      </div>
                      <p className={`mt-3 break-words font-mono text-xl font-bold tracking-tight ${metric.valueClass}`}>{metric.value}</p>
                      <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">{metric.detail}</p>
                    </article>
                  );
                })}
              </div>
              {cashFlowChart}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                  {categoryPanel(5)}
                  <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs sm:p-5">
                    <h3 className="text-sm font-bold text-[var(--text)]">Cash flow snapshot</h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Period totals for {activeCurrency || 'the selected currency'}.</p>
                    <dl className="mt-4 divide-y divide-[var(--border)]">
                      <div className="flex items-center justify-between gap-3 py-3 text-xs"><dt className="text-[var(--text-secondary)]">Income</dt><dd className="font-mono font-semibold text-emerald-600">+{formatMoney(currencySummary.income)}</dd></div>
                      <div className="flex items-center justify-between gap-3 py-3 text-xs"><dt className="text-[var(--text-secondary)]">Net spending</dt><dd className="font-mono font-semibold text-rose-600">−{formatMoney(currencySummary.netExpenses)}</dd></div>
                      <div className="flex items-center justify-between gap-3 py-3 text-xs"><dt className="text-[var(--text-secondary)]">Refunds</dt><dd className="font-mono font-semibold text-sky-600">+{formatMoney(currencySummary.refunds)}</dd></div>
                      <div className="flex items-center justify-between gap-3 py-3 text-xs"><dt className="font-semibold text-[var(--text)]">Net savings</dt><dd className={`font-mono font-bold ${Number(currencySummary.netSavings) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoney(currencySummary.netSavings)}</dd></div>
                    </dl>
                    <p className="mt-2 rounded-lg bg-[var(--surface-raised)]/60 p-2.5 text-[10px] leading-4 text-[var(--text-muted)]">Transfers between your own accounts are excluded from income and spending totals.</p>
                  </section>
                </div>
              )}
              {activeTab === 'income_expenses' && cashFlowTable}
            </>
          )}

          {activeTab === 'category' && categoryPanel()}

          {activeTab === 'cash_flow' && (
            <>
              {cashFlowChart}
              <div>
                <div className="mb-3"><h3 className="text-sm font-bold text-[var(--text)]">Monthly detail</h3><p className="mt-1 text-xs text-[var(--text-secondary)]">Income, net expenses and resulting cash flow for each month.</p></div>
                {cashFlowTable}
              </div>
            </>
          )}

          {activeTab === 'export' && (
            <section className="max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><Download className="size-5" /></span>
                <div><h3 className="text-base font-bold text-[var(--text)]">Export your transaction ledger</h3><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Download a CSV file for spreadsheets, bookkeeping, or your own records. The export follows the period and currency selected above.</p></div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-[var(--surface-raised)]/70 p-4 text-xs sm:grid-cols-3">
                <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Period</p><p className="mt-1 font-semibold text-[var(--text)]">{periodOptions.find((option) => option.id === period)?.label || 'All time'}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Currency</p><p className="mt-1 font-semibold text-[var(--text)]">{activeCurrency || 'All available'}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Transactions</p><p className="mt-1 font-semibold text-[var(--text)]">{summary?.totalTransactions || 0} records in period</p></div>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-[var(--text-muted)]">Amounts are exported in each transaction’s original currency. FinLab does not convert historical values for this report.</p>
              <button type="button" onClick={handleExportCsv} disabled={exporting} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-60">
                <Download className="size-4" /> {exporting ? 'Preparing download…' : 'Download transactions CSV'}
              </button>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
