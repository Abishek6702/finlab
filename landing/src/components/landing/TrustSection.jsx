import { Sparkles, Layers, Eye, ShieldCheck } from 'lucide-react';
import Container from '../ui/Container';
import { TRUST_PRINCIPLES } from '../../lib/constants';

const ICONS = {
  Sparkles,
  Layers,
  Eye,
  ShieldCheck,
};

export default function TrustSection() {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface-raised)]/40 py-12 sm:py-16">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
            Core Design Philosophy
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight">
            Engineered on uncompromising financial principles
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRUST_PRINCIPLES.map((principle) => {
            const Icon = ICONS[principle.icon] || Sparkles;
            return (
              <div
                key={principle.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs transition hover:shadow-md hover:border-[var(--primary)]/40 flex flex-col justify-start"
              >
                <div className="grid size-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] mb-4">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base font-bold text-[var(--text)]">{principle.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {principle.description}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

