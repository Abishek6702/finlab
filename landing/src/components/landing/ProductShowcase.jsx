'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  Plus,
  TrendingUp,
} from 'lucide-react';
import Container from '../ui/Container';
import SectionHeading from '../ui/SectionHeading';

const TABS = [
  { id: 'dashboard', label: 'Financial Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transaction Ledger', icon: Receipt },
  { id: 'budgets', label: 'Smart Budgets', icon: PieChart },
  { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
];

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <section id="showcase" className="py-20 sm:py-28 bg-[var(--surface-raised)]/50 border-y border-[var(--border)] scroll-mt-20">
      <Container>
        <SectionHeading
          badge="Interactive Preview"
          title="See your financial picture more clearly."
          description="Engineered to provide instant visual clarity across every dimension of your personal finances."
        />

        {/* Tab Navigation Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 sm:mb-12">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 focus-visible:outline-2 ${
                  isActive
                    ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
                }`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Screen Mockup */}
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl transition-all duration-300">
          {/* Top Mockup Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-raised)]/70 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-rose-400" />
                <div className="size-2.5 rounded-full bg-amber-400" />
                <div className="size-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-[var(--text)] font-mono">
                workspace / {activeTab}
              </span>
            </div>
            <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--text-muted)] font-mono">
              FINLAB OS 2.0
            </span>
          </div>

          {/* Screen Content Panels */}
          <div className="p-5 sm:p-8 bg-[var(--background)]/40 min-h-[460px]">
            {/* 1. Dashboard View */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-xs text-[var(--text-muted)] font-medium">Net Assets</div>
                    <div className="mt-1 text-2xl font-bold font-mono text-[var(--text)]">INR 1,24,500.00</div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-semibold">+8.2% monthly</div>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-xs text-[var(--text-muted)] font-medium">Month Inflow</div>
                    <div className="mt-1 text-2xl font-bold font-mono text-emerald-600">+INR 65,000.00</div>
                    <div className="mt-1 text-[11px] text-[var(--text-muted)]">Salary & dividends</div>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-xs text-[var(--text-muted)] font-medium">Month Outflow</div>
                    <div className="mt-1 text-2xl font-bold font-mono text-rose-600">-INR 28,450.00</div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-semibold">Under monthly limit</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                      Connected Financial Accounts
                    </h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-raised)]/60 text-xs">
                        <span className="font-semibold text-[var(--text)]">HDFC Salary Checking</span>
                        <span className="font-mono font-bold text-[var(--text)]">INR 78,200.00</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-raised)]/60 text-xs">
                        <span className="font-semibold text-[var(--text)]">ICICI High Yield Savings</span>
                        <span className="font-mono font-bold text-[var(--text)]">INR 42,500.00</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-raised)]/60 text-xs">
                        <span className="font-semibold text-[var(--text)]">Cash Reserve Wallet</span>
                        <span className="font-mono font-bold text-[var(--text)]">INR 3,800.00</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                      Savings Milestone Projection
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[var(--text)]">Emergency Fund</span>
                        <span className="font-mono text-emerald-600 font-bold">78% achieved</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: '78%' }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-mono">
                        <span>INR 78,000 saved</span>
                        <span>Target: INR 1,00,000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Transaction Ledger View */}
            {activeTab === 'transactions' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
                  <div className="flex gap-1.5 text-xs">
                    <span className="px-3 py-1 rounded-lg bg-[var(--primary)] text-white font-semibold">All</span>
                    <span className="px-3 py-1 rounded-lg bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">Income</span>
                    <span className="px-3 py-1 rounded-lg bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">Expenses</span>
                    <span className="px-3 py-1 rounded-lg bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">Transfers</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]">
                      <Filter className="size-3.5" /> Filter
                    </button>
                    <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--primary)] text-white font-semibold">
                      <Plus className="size-3.5" /> Add Transaction
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Account</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] font-medium">
                      <tr>
                        <td className="py-3 px-3 text-[var(--text-muted)]">Nov 06</td>
                        <td className="py-3 px-3 font-semibold text-[var(--text)]">Organic Groceries & Produce</td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">HDFC Salary</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-semibold text-[10px]">
                            Groceries
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">-INR 1,450.00</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 text-[var(--text-muted)]">Nov 05</td>
                        <td className="py-3 px-3 font-semibold text-[var(--text)]">Monthly Consulting Retainer</td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">ICICI Savings</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-semibold text-[10px]">
                            Income
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">+INR 45,000.00</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 text-[var(--text-muted)]">Nov 04</td>
                        <td className="py-3 px-3 font-semibold text-[var(--text)]">Petrol Refuel (Two Wheeler)</td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">Cash Wallet</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 font-semibold text-[10px]">
                            Travel
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">-INR 600.00</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 text-[var(--text-muted)]">Nov 02</td>
                        <td className="py-3 px-3 font-semibold text-[var(--text)]">Cloud Server Subscription</td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">HDFC Salary</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 font-semibold text-[10px]">
                            Utilities
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">-INR 1,200.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. Budget Overview */}
            {activeTab === 'budgets' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text)]">Active Monthly Budgets</h4>
                    <p className="text-xs text-[var(--text-muted)]">Zero-drift spending boundaries</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600">
                    All Within Target
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Budget Card 1 */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-[var(--text)]">Groceries & Dining</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Monthly budget</div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        42% spent
                      </span>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: '42%' }} />
                    </div>
                    <div className="mt-3 flex justify-between text-xs pt-2 border-t border-[var(--border)] font-mono">
                      <span className="text-[var(--text-muted)]">INR 4,200</span>
                      <span className="font-bold text-[var(--text)]">Limit: INR 10,000</span>
                    </div>
                  </div>

                  {/* Budget Card 2 */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-[var(--text)]">Travel & Fuel</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Monthly budget</div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        75% spent
                      </span>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: '75%' }} />
                    </div>
                    <div className="mt-3 flex justify-between text-xs pt-2 border-t border-[var(--border)] font-mono">
                      <span className="text-[var(--text-muted)]">INR 2,250</span>
                      <span className="font-bold text-[var(--text)]">Limit: INR 3,000</span>
                    </div>
                  </div>

                  {/* Budget Card 3 */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-[var(--text)]">Shopping & Lifestyle</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Monthly budget</div>
                      </div>
                      <span className="text-[10px] font-bold text-sky-600 bg-sky-500/10 px-1.5 py-0.5 rounded">
                        30% spent
                      </span>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: '30%' }} />
                    </div>
                    <div className="mt-3 flex justify-between text-xs pt-2 border-t border-[var(--border)] font-mono">
                      <span className="text-[var(--text-muted)]">INR 1,500</span>
                      <span className="font-bold text-[var(--text)]">Limit: INR 5,000</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Analytics & Reports */}
            {activeTab === 'analytics' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text)]">Cash Flow Velocity & Distribution</h4>
                    <p className="text-xs text-[var(--text-muted)]">Authoritative monthly rollup</p>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--text)]">
                    <Download className="size-3.5" /> Export Clean CSV
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-xs font-bold text-[var(--text)] mb-3">Income vs Expense Velocity</div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1 font-mono">
                          <span className="text-emerald-600 font-bold">Total Inflow</span>
                          <span className="font-bold text-emerald-600">+INR 65,000.00</span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-emerald-100 dark:bg-emerald-950 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1 font-mono">
                          <span className="text-rose-600 font-bold">Total Outflow</span>
                          <span className="font-bold text-rose-600">-INR 28,450.00</span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-rose-100 dark:bg-rose-950 overflow-hidden">
                          <div className="h-full rounded-full bg-rose-500" style={{ width: '43.7%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text)] mb-2">Net Monthly Retention</div>
                      <div className="text-2xl font-extrabold text-emerald-600 font-mono">+INR 36,550.00</div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        You retained 56.2% of your monthly cash flow into savings and debt retirement.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                      <CheckCircle2 className="size-4" /> Balanced ledger verified across all accounts
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

