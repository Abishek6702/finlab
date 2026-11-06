import { UserCheck, Layers, LineChart, ArrowRight, CheckCircle2 } from 'lucide-react';
import Container from '../ui/Container';
import SectionHeading from '../ui/SectionHeading';
import Button from '../ui/Button';
import { STEPS, getAppUrl } from '../../lib/constants';

const STEP_ICONS = [UserCheck, Layers, LineChart];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 lg:py-32 scroll-mt-20">
      <Container>
        <SectionHeading
          badge="Seamless Onboarding"
          title="Get started in three simple steps."
          description="A frictionless path from financial fragmentation to complete clarity in less than three minutes."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector Line for larger screens */}
          <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 -translate-y-8 bg-gradient-to-r from-[var(--border)] via-[var(--primary)]/30 to-[var(--border)] -z-10" />

          {STEPS.map((step, idx) => {
            const Icon = STEP_ICONS[idx] || UserCheck;
            return (
              <div
                key={step.step}
                className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-3xl font-extrabold text-[var(--primary)] opacity-90">
                      {step.step}
                    </span>
                    <div className="grid size-12 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Icon className="size-6" />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-[var(--text)] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                    {step.description}
                  </p>

                  {/* Bullet points */}
                  <ul className="space-y-2 pt-4 border-t border-[var(--border)]">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-center gap-2 text-xs text-[var(--text)] font-medium">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action prompt */}
        <div className="mt-12 text-center">
          <Button
            href={getAppUrl('/register')}
            variant="primary"
            size="md"
            icon={ArrowRight}
            className="shadow-sm hover:shadow-md"
          >
            Create Your Free Account Now
          </Button>
        </div>
      </Container>
    </section>
  );
}

