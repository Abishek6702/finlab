import { KeyRound, UserCheck, Shield, Database, Lock, CheckCircle2 } from 'lucide-react';
import Container from '../ui/Container';
import SectionHeading from '../ui/SectionHeading';
import { SECURITY_POINTS } from '../../lib/constants';

const ICON_MAP = {
  KeyRound,
  UserCheck,
  Shield,
  Database,
};

export default function SecuritySection() {
  return (
    <section id="security" className="py-20 sm:py-28 lg:py-32 scroll-mt-20">
      <Container>
        <SectionHeading
          badge="Security & Privacy"
          title="Your financial information deserves care."
          description="We treat data sovereignty, password protection, and access authorization as essential system requirements."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {SECURITY_POINTS.map((point) => {
            const Icon = ICON_MAP[point.icon] || Shield;
            return (
              <div
                key={point.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="grid size-12 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] mb-5">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text)] mb-2">
                    {point.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {point.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center gap-2 text-xs text-blue-600 font-semibold">
                  <CheckCircle2 className="size-3.5 text-blue-500 shrink-0" />
                  <span>Enforced in architecture</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Commitment Box */}
        <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/60 p-5 sm:p-6 text-center">
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            <strong className="text-[var(--text)]">Our Privacy Promise:</strong> finLab does not sell your personal financial records to advertising networks or broker your transaction patterns. You maintain full ownership with instant one-click JSON data export and permanent account deactivation whenever you choose.
          </p>
        </div>
      </Container>
    </section>
  );
}

