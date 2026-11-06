import { CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import Container from '../ui/Container';
import SectionHeading from '../ui/SectionHeading';
import { BENEFITS } from '../../lib/constants';

export default function Benefits() {
  return (
    <section id="benefits" className="py-20 sm:py-28 bg-[var(--surface-raised)]/40 border-y border-[var(--border)] scroll-mt-20">
      <Container>
        <SectionHeading
          badge="Tangible Impact"
          title="Make every financial decision more intentional."
          description="Designed for individuals who want thoughtful awareness instead of chaotic spreadsheets and blind guesswork."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BENEFITS.map((benefit, idx) => (
            <div
              key={benefit.title}
              className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                idx === 0 ? 'md:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-bold font-mono">
                    {benefit.stat}
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {benefit.statLabel}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[var(--text)] mb-2">
                  {benefit.title}
                </h3>

                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {benefit.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Verified in finLab core workspace</span>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

