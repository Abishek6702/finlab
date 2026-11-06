import { useState, useEffect } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  TrendingUp, 
  Wallet 
} from 'lucide-react';
import { dashboardApi } from '../../api/apiClient';
import { formatCurrencyAmount, majorUnitsFromMinor } from '../../moneyUtils';

export default function OverviewView({ onQuickAddTransaction }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboard = () => {
    dashboardApi.getSummary()
      .then((res) => {
        if (res.data?.success) {
          setData(res.data.data);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)]">
          <RefreshCw className="size-6 animate-spin text-[var(--primary)]" />
          <span className="text-sm font-medium">Loading live financial data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-600">
        <p className="font-semibold">Unable to load dashboard</p>
        <p className="mt-1 text-xs">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchDashboard();
          }}
          className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    );
  }

  const baseCurrency = data?.baseCurrency || 'USD';
  const currencyBalances = data?.currencyBalances || {};
  const currencies = Object.keys(currencyBalances).length > 0 ? Object.keys(currencyBalances) : [baseCurrency];
  const primaryCurrency = currencies[0] || baseCurrency;
  
  const curBalObj = currencyBalances[primaryCurrency] || { assets: data?.totalAssets || 0, liabilities: data?.totalLiabilities || 0, net: data?.totalBalance || 0 };
  const totalAssets = curBalObj.assets ?? data?.totalAssets ?? 0;
  const creditLiabilities = curBalObj.liabilities ?? data?.totalLiabilities ?? 0;
  const netWorth = curBalObj.net ?? data?.totalBalance ?? 0;

  const income = data?.monthly?.income ?? 0;
  const spending = data?.monthly?.expenses ?? 0;
  const savingsRate = data?.monthly?.savingsRate ?? (income > 0 ? Math.max(0, Math.round(((income - spending) / income) * 100)) : 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Multi-currency selector if multiple currencies exist */}
      {currencies.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-xs">
          <span className="font-semibold text-[var(--text)]">Currencies active:</span>
          {currencies.map((cur) => {
            const cb = currencyBalances[cur] || {};
            const net = cb.net ?? 0;
            return (
              <span key={cur} className="rounded-md bg-[var(--surface)] px-2 py-1 font-mono font-medium shadow-xs border border-[var(--border)]">
              {cur}: {net >= 0 ? '+' : ''}{formatCurrencyAmount(net, cur)}
              </span>
            );
          })}
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Assets */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
            <span>Total Assets</span>
            <span className="grid size-8 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
              <Wallet className="size-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[var(--text)]">
            {primaryCurrency} {formatCurrencyAmount(totalAssets, primaryCurrency)}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Net worth: {primaryCurrency} {formatCurrencyAmount(netWorth, primaryCurrency)}
          </p>
        </div>

        {/* Monthly Income */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
            <span>Income (This Month)</span>
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <ArrowDownLeft className="size-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-emerald-600">
            +{baseCurrency} {formatCurrencyAmount(income, baseCurrency)}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Authoritative ledger inflows
          </p>
        </div>

        {/* Monthly Spending */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
            <span>Spending (Net)</span>
            <span className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-600">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-rose-600">
            -{baseCurrency} {formatCurrencyAmount(spending, baseCurrency)}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Includes expense refunds
          </p>
        </div>

        {/* Savings Rate or Credit Debt */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
            <span>Savings Rate</span>
            <span className="grid size-8 place-items-center rounded-lg bg-sky-500/10 text-sky-600">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-sky-600">
            {savingsRate}%
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Monthly retention</span>
            {creditLiabilities > 0 && (
              <span className="text-amber-600 font-medium">Debt: {primaryCurrency} {formatCurrencyAmount(creditLiabilities, primaryCurrency)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Accounts Overview & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Transactions List (2 columns wide) */}
        <div className="lg:col-span-2  rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
          <div className="flex  items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-[var(--text)]">Recent Transactions</h3>
              <p className="text-xs text-[var(--text-secondary)]">Latest recorded financial entries</p>
            </div>
            {/* {onQuickAddTransaction && (
              <button
                onClick={onQuickAddTransaction}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
              >
                <Plus className="size-3.5" />
                Add Transaction
              </button>
            )} */}
          </div>

          {data?.recentTransactions?.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {data.recentTransactions.slice(0, 7).map((tx) => {
                const isIncome = tx.type === 'income';
                const isRefund = tx.type === 'refund';
                const isTransfer = tx.type === 'transfer';
                const txAmount = tx.amount ?? majorUnitsFromMinor(tx.amountMinor, tx.currency);
                return (
                  <div key={tx._id} className="flex items-center justify-between py-3.5 text-sm transition hover:bg-[var(--surface-raised)]/50 px-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`grid size-9 place-items-center rounded-xl font-bold text-xs ${
                        isIncome ? 'bg-emerald-500/10 text-emerald-600' :
                        isRefund ? 'bg-sky-500/10 text-sky-600' :
                        isTransfer ? 'bg-indigo-500/10 text-indigo-600' :
                        'bg-rose-500/10 text-rose-600'
                      }`}>
                        {isIncome ? '↓' : isRefund ? '↺' : isTransfer ? '⇄' : '↑'}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--text)] line-clamp-1">
                          {tx.description || tx.categoryId?.name || 'Transaction'}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {new Date(tx.transactionDate).toLocaleDateString()} • {tx.accountId?.name || 'Account'} • {tx.type}
                        </div>
                      </div>
                    </div>
                    <div className={`font-semibold font-mono text-right ${
                      isIncome ? 'text-emerald-600' :
                      isRefund ? 'text-sky-600' :
                      isTransfer ? 'text-indigo-600' :
                      'text-[var(--text)]'
                    }`}>
                      {isIncome ? '+' : isRefund ? '+' : isTransfer ? '' : '−'}{tx.currency} {formatCurrencyAmount(txAmount, tx.currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-[var(--text-secondary)]">
              <p className="font-semibold">No transactions recorded yet</p>
              <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm">
                Get started by creating your first financial entry or linking your accounts.
              </p>
              {onQuickAddTransaction && (
                <button
                  onClick={onQuickAddTransaction}
                  className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white"
                >
                  Create First Transaction
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Account Balances & Savings Goals */}
        <div className="space-y-6">
          {/* Accounts Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
            <h3 className="text-base font-bold text-[var(--text)] mb-1">Accounts</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Live balance breakdown</p>

            {data?.accounts?.length > 0 ? (
              <div className="space-y-3">
                {data.accounts.map((acc) => {
                  const balanceNum = acc.currentBalance ?? acc.balance ?? 0;
                  return (
                    <div key={acc._id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/40">
                      <div className="flex items-center gap-2.5">
                        <div className="size-2.5 rounded-full" style={{ backgroundColor: acc.color || '#3B82F6' }} />
                        <div>
                          <div className="text-xs font-semibold text-[var(--text)]">{acc.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] capitalize">{acc.type.replace('_', ' ')}</div>
                        </div>
                      </div>
                      <div className="text-xs font-bold font-mono text-[var(--text)]">
                        {acc.currency} {formatCurrencyAmount(balanceNum, acc.currency)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-[var(--text-muted)]">
                No accounts configured yet.
              </div>
            )}
          </div>

          {/* Savings Goal Quick Preview */}
          {data?.savingsGoals?.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-base font-bold text-[var(--text)] mb-1">Savings Goals</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Target progress</p>

              <div className="space-y-4">
                {data.savingsGoals.map((goal) => {
                  const curAmount = goal.currentAmount ?? 0;
                  const targetAmount = goal.targetAmount ?? 0;
                  const pct = targetAmount > 0 ? Math.min(100, Math.round((curAmount / targetAmount) * 100)) : 0;
                  return (
                    <div key={goal._id} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-[var(--text)]">
                        <span>{goal.name}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
                        <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                        <span>{goal.currency} {formatCurrencyAmount(curAmount, goal.currency)}</span>
                        <span>Target: {goal.currency} {formatCurrencyAmount(targetAmount, goal.currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
