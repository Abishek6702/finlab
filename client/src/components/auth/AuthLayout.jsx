import { Link } from 'react-router-dom';
import ThemeToggle from '../common/ThemeToggle';

const bars = [36, 52, 43, 64, 57, 76, 62, 90, 73, 100, 84, 112];

export default function AuthLayout({ children, heading, subheading }) {
  return (
    <main className="grid min-h-screen bg-[var(--background)] text-[var(--text)] lg:grid-cols-[minmax(410px,.88fr)_1.12fr]">
      <section className="flex min-h-screen flex-col items-center justify-center px-5 py-8 sm:px-10 lg:px-16 xl:px-20">
        <div className="w-full max-w-[390px]">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2.5 text-[21px] font-bold tracking-tight text-[var(--text)] no-underline" aria-label="FinLab home">
              <span className="grid size-9 place-items-center rounded-xl bg-[var(--primary)] text-sm text-white">FL</span><span>FinLab</span>
            </Link>
            <ThemeToggle compact />
          </div>
          <h1 className="m-0 text-[28px] leading-tight font-bold tracking-tight text-[var(--text)]">{heading}</h1>
          <p className="mt-2 mb-6 text-sm leading-relaxed text-[var(--text-secondary)]">{subheading}</p>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-7">{children}</div>
          <p className="mt-5 text-center text-[11px] text-[var(--text-muted)]">© {new Date().getFullYear()} FinLab. Personal finance, with clarity.</p>
        </div>
      </section>

      <aside className="relative hidden flex-col justify-between overflow-hidden border-l border-[var(--border)] bg-[var(--surface-raised)] px-10 py-8 lg:flex xl:px-16">
        <div className="flex justify-end"><span className="text-xs font-medium text-[var(--text-secondary)]">A clearer view of your finances</span></div>
        <div className="mx-auto w-full max-w-[540px] py-12">
          <span className="text-xs font-semibold tracking-[.14em] text-[var(--primary)] uppercase">Your personal finance workspace</span>
          <h2 className="mt-4 mb-0 max-w-lg text-4xl leading-[1.08] font-bold tracking-tight text-[var(--text)] xl:text-[48px]">Your money. Your clarity. Your control.</h2>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-[var(--text-secondary)]">Manage accounts, track expenses, plan budgets and build better financial habits in one secure workspace.</p>
          <div className="mt-9 max-w-[470px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Monthly overview</span><span>Illustrative preview</span></div>
            <div className="mt-3 text-[26px] font-bold tracking-tight text-[var(--text)]">A more confident plan</div>
            <div className="mt-5 flex h-20 items-end gap-2 border-b border-[var(--border)]" aria-hidden="true">
              {bars.map((height, index) => <span key={index} className={`flex-1 rounded-t-sm ${index % 2 ? 'bg-[var(--income)]/60' : 'bg-[var(--primary)]/75'}`} style={{ height: `${height}%` }} />)}
            </div>
          </div>
        </div>
        <div className="flex justify-between text-[11px] text-[var(--text-muted)]"><span>FinLab Workspace</span><span>Built for everyday decisions</span></div>
      </aside>
    </main>
  );
}
