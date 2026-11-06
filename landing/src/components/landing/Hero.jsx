import { ArrowRight, Sparkles, TrendingUp, TrendingDown, ArrowUpRight, ShieldCheck, Wallet, ArrowDownRight, Layers, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Container from '../ui/Container';
import { getAppUrl, BRAND } from '../../lib/constants';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-16 lg:pb-32">
      {/* Background ambient glow effect */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[var(--primary)] to-cyan-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
        />
      </div>

      <Container>
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)]/50 px-3.5 py-1 text-xs font-semibold text-[var(--primary)] backdrop-blur-xs shadow-xs mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Sparkles className="size-3.5" />
            <span className="tracking-wide uppercase text-[11px] font-bold">
              Personal Finance, Simplified
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-[var(--text)] leading-[1.08]">
            Your money.{' '}
            <span className="bg-gradient-to-r from-[var(--primary)] via-blue-600 to-sky-500 bg-clip-text text-transparent">
              Your clarity.
            </span>{' '}
            Your control.
          </h1>

          {/* Description */}
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl font-normal">
            Take control of your financial life with one intelligent workspace. Track expenses, manage accounts, plan budgets and build better financial habits with finLab.
          </p>

          {/* CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            <Button
              href={getAppUrl('/login')}
              variant="primary"
              size="lg"
              icon={ArrowRight}
              className="w-full sm:w-auto shadow-md hover:shadow-lg shadow-[var(--primary)]/20 text-sm sm:text-base font-bold"
            >
              Get Started – It&apos;s Free
            </Button>
            <Button
              href="#features"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Explore Features
            </Button>
          </div>

          {/* Trust reassurance pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-[var(--text-muted)] font-medium">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              100% Free Forever
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-blue-500" />
              Private & Self-Owned Data
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              No Credit Card Required
            </span>
          </div>
        </div>

        {/* Product Dashboard Preview Mockup */}
        <div className="mt-12 sm:mt-16 lg:mt-20 relative mx-auto max-w-6xl">
          {/* Subtle outer glow border */}
          <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-b from-[var(--primary)]/20 via-sky-400/10 to-transparent blur-md -z-10" />

          {/* Mockup Card Container */}
          <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            {/* Mockup Window Header Bar */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-raised)]/70 px-4 py-3 backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-rose-400/80" />
                <div className="size-3 rounded-full bg-amber-400/80" />
                <div className="size-3 rounded-full bg-emerald-400/80" />
                <span className="ml-2 hidden sm:inline-block text-[11px] font-mono text-[var(--text-muted)]">
                  app.finlab.workspace/overview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
                <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--text-muted)] font-mono">
                  DEMO DATA
                </span>
              </div>
            </div>

            {/* Dashboard Inner Canvas */}
            <div className="p-4 sm:p-6 lg:p-8 bg-[var(--background)]/50 space-y-6">
              {/* Top Row: Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Balance / Net Assets */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
                    <span>Total Balance</span>
                    <Wallet className="size-4 text-[var(--primary)]" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-[var(--text)] tracking-tight font-mono">
                    $14,850.00
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <TrendingUp className="size-3.5" />
                    <span>+12.4% vs last month</span>
                  </div>
                </div>

                {/* Monthly Income */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
                    <span>Monthly Inflow</span>
                    <ArrowUpRight className="size-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-emerald-600 tracking-tight font-mono">
                    +$8,450.00
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    Authoritative salary & yields
                  </div>
                </div>

                {/* Monthly Spending */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
                    <span>Monthly Outflow</span>
                    <ArrowDownRight className="size-4 text-rose-600" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-rose-600 tracking-tight font-mono">
                    -$3,120.00
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    Across 34 categorized entries
                  </div>
                </div>

                {/* Savings Rate */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
                    <span>Savings Rate</span>
                    <TrendingUp className="size-4 text-sky-500" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-[var(--primary)] tracking-tight font-mono">
                    63.1%
                  </div>
                  <div className="mt-1 text-xs text-emerald-600 font-semibold">
                    +$5,330.00 retained
                  </div>
                </div>
              </div>

              {/* Middle Row: Analytics & Recent Transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Spending Analytics & Budget Meters (7 cols) */}
                <div className="lg:col-span-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                      <div>
                        <h2 className="text-sm font-bold text-[var(--text)]">Spending by Category</h2>
                        <p className="text-xs text-[var(--text-muted)]">Active monthly budget utilization</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] text-[var(--text-secondary)]">
                        November 2026
                      </span>
                    </div>

                    {/* Progress bars */}
                    <div className="mt-5 space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span className="text-[var(--text)] font-semibold">Housing & Utilities</span>
                          <span className="text-[var(--text-muted)] font-mono">$1,250 / $1,400 (89%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: '89%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span className="text-[var(--text)] font-semibold">Groceries & Dining</span>
                          <span className="text-[var(--text-muted)] font-mono">$640 / $1,000 (64%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: '64%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span className="text-[var(--text)] font-semibold">Travel & Transit</span>
                          <span className="text-[var(--text-muted)] font-mono">$280 / $450 (62%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                          <div className="h-full rounded-full bg-sky-500" style={{ width: '62%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span className="text-[var(--text)] font-semibold">Entertainment & Misc</span>
                          <span className="text-amber-500 font-bold font-mono">$420 / $500 (84%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                          <div className="h-full rounded-full bg-amber-500" style={{ width: '84%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Micro Summary Banner */}
                  <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/60 p-3 flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)] font-medium">Remaining Discretionary Capacity</span>
                    <span className="font-mono font-bold text-emerald-600">+$760.00 safe to spend</span>
                  </div>
                </div>

                {/* Recent Transactions List (5 cols) */}
                <div className="lg:col-span-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                    <div>
                      <h2 className="text-sm font-bold text-[var(--text)]">Recent Ledger Activity</h2>
                      <p className="text-xs text-[var(--text-muted)]">Latest verified transactions</p>
                    </div>
                    <span className="text-[11px] text-[var(--primary)] font-semibold">Live Feed</span>
                  </div>

                  <div className="mt-4 divide-y divide-[var(--border)]">
                    <div className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 grid place-items-center text-xs font-bold">
                          ↓
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text)]">Tech Corp Payroll</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Nov 05 • Checking Account</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-600">+$4,250.00</span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-rose-500/10 text-rose-600 grid place-items-center text-xs font-bold">
                          ↑
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text)]">Whole Foods Market</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Nov 04 • Groceries</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-rose-600">-$142.80</span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 grid place-items-center text-xs font-bold">
                          ⇄
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text)]">Emergency Fund Transfer</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Nov 03 • Savings Goal</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-[var(--primary)]">$500.00</span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-rose-500/10 text-rose-600 grid place-items-center text-xs font-bold">
                          ↑
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text)]">Metro Rail Pass</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Nov 02 • Travel</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-rose-600">-$65.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

