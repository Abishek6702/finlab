import { useCallback, useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, RefreshCw, TrendingUp } from 'lucide-react';
import { reportApi } from '../../api/apiClient';
import { formatCurrencyAmount } from '../../moneyUtils';

export default function ReportsView({ initialTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchReports = useCallback(() => Promise.all([
      reportApi.getSummary(),
      reportApi.getCategoryAnalysis({ type: 'expense' }),
      reportApi.getCashFlow(),
    ]), []);

  const applyReportData = useCallback(([sRes, cRes, cfRes]) => {
    if (sRes.data?.success) setSummary(sRes.data.data);
    if (cRes.data?.success) setCategoryData(cRes.data.data.categories || []);
    if (cfRes.data?.success) setCashFlow(cfRes.data.data || []);
  }, []);

  const loadReports = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetchReports()
      .then(applyReportData)
      .catch((err) => setLoadError(err.response?.data?.message || 'Unable to load reports. Try again.'))
      .finally(() => setLoading(false));
  }, [applyReportData, fetchReports]);

  useEffect(() => {
    let active = true;
    fetchReports()
      .then((responses) => { if (active) applyReportData(responses); })
      .catch((err) => { if (active) setLoadError(err.response?.data?.message || 'Unable to load reports. Try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applyReportData, fetchReports]);

  const handleExportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const response = await reportApi.exportCsv();
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'finlab_transactions.csv';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setExportError(err.response?.data?.message || 'Unable to export transactions. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'income_expenses', label: 'Income & Expenses' },
    { id: 'category', label: 'Category Analysis' },
    { id: 'cash_flow', label: 'Cash Flow' },
    { id: 'export', label: 'Export Reports' },
  ];

  const primaryCur = summary?.summaryByCurrency ? Object.keys(summary.summaryByCurrency)[0] : 'USD';
  const curSummary = summary?.summaryByCurrency?.[primaryCur] || { income: 0, expense: 0, netExpenses: 0, netSavings: 0, savingsRate: 0 };
  const formatMoney = (amount, currency) => `${currency} ${formatCurrencyAmount(amount, currency)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Reports & Analytics</h2>
          <p className="text-xs text-[var(--text-secondary)]">Examine spending trends, net cash flow and category breakdowns</p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-semibold text-[var(--text)] shadow-xs transition hover:bg-[var(--surface-raised)]"
        >
          <Download className="size-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {exportError && (
        <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600">
          {exportError}
        </p>
      )}

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

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <RefreshCw className="size-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-sm text-rose-600">
          <p className="font-semibold">Unable to load reports</p>
          <p className="mt-1 text-xs">{loadError}</p>
          <button onClick={loadReports} className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white">
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Income vs Expenses Cards */}
          {(activeTab === 'overview' || activeTab === 'income_expenses') && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Total Inflow</span>
                  <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <ArrowDownLeft className="size-3.5" />
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">
                  +{primaryCur} {formatCurrencyAmount(curSummary.income, primaryCur)}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Total Outflow (Net)</span>
                  <span className="grid size-7 place-items-center rounded-lg bg-rose-500/10 text-rose-600">
                    <ArrowUpRight className="size-3.5" />
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-rose-600">
                  -{primaryCur} {formatCurrencyAmount(curSummary.netExpenses, primaryCur)}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Net Savings</span>
                  <span className="grid size-7 place-items-center rounded-lg bg-sky-500/10 text-sky-600">
                    <TrendingUp className="size-3.5" />
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-sky-600">
                  {primaryCur} {formatCurrencyAmount(curSummary.netSavings, primaryCur)}
                </div>
              </div>
            </div>
          )}

          {/* Category Breakdown Table */}
          {(activeTab === 'overview' || activeTab === 'category') && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--text)]">Category Spending Distribution</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Expense concentration across categories</p>
                </div>
              </div>

              {categoryData.length > 0 ? (
                <div className="space-y-4">
                  {categoryData.map((cat) => (
                    <div key={`${cat.currency}:${cat.categoryId}`} className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="flex items-center gap-2 text-[var(--text)]">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: cat.color || '#3B82F6' }} />
                          {cat.name} ({cat.count} transactions)
                        </span>
                        <span className="font-mono text-[var(--text)]">
                          {cat.percentage}% ({formatMoney(cat.total, cat.currency)})
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.color || '#3B82F6',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-[var(--text-muted)]">No category data available for this range.</p>
              )}
            </div>
          )}

          {/* Cash Flow Timeline */}
          {(activeTab === 'overview' || activeTab === 'cash_flow') && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-base font-bold text-[var(--text)] mb-1">Cash Flow Over Time</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Monthly Inflow vs Outflow history</p>

              {cashFlow.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[var(--border)] bg-[var(--surface-raised)] text-[11px] font-semibold text-[var(--text-muted)] uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Period</th>
                        <th className="py-2.5 px-4 text-right">Inflow (Income)</th>
                        <th className="py-2.5 px-4 text-right">Outflow (Net Expenses)</th>
                        <th className="py-2.5 px-4 text-right">Net Flow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] font-mono">
                      {cashFlow.map((cf) => (
                        <tr key={`${cf.period}:${cf.currency}`} className="hover:bg-[var(--surface-raised)]/40 transition">
                          <td className="py-3 px-4 font-sans font-semibold text-[var(--text)]">{cf.period}</td>
                          <td className="py-3 px-4 text-right text-emerald-600">+{formatMoney(cf.income, cf.currency)}</td>
                          <td className="py-3 px-4 text-right text-rose-600">-{formatMoney(cf.expense, cf.currency)}</td>
                          <td className={`py-3 px-4 text-right font-bold ${cf.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {cf.netFlow >= 0 ? '+' : ''}{formatMoney(cf.netFlow, cf.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-[var(--text-muted)]">No cash flow timeline data yet.</p>
              )}
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs max-w-xl">
              <h3 className="text-base font-bold text-[var(--text)] mb-2">Export Financial Records</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6">
                Download your complete transaction ledger as a standard RFC 4180 CSV spreadsheet.
              </p>
              <button
                onClick={handleExportCsv}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:opacity-95"
              >
                <Download className="size-4" />
                {exporting ? 'Preparing download…' : 'Download Transactions (CSV)'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
