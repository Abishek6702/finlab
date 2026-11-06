import { ArrowRight, Sparkles } from 'lucide-react';
import Container from '../ui/Container';
import Button from '../ui/Button';
import { getAppUrl } from '../../lib/constants';

export default function FinalCTA() {
  return (
    <section className="py-20 sm:py-28 lg:py-32 relative overflow-hidden">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--deep-navy)] via-[#1e293b] to-[var(--primary)] px-6 py-16 sm:px-12 sm:py-20 text-center shadow-2xl">
          {/* Subtle background blur rings */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 rounded-full bg-[var(--primary)]/30 blur-3xl"
          />

          <div className="relative max-w-2xl mx-auto z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-white/10 text-white backdrop-blur-xs border border-white/20">
              <Sparkles className="size-3.5 text-sky-300" />
              100% Free Personal Finance Workspace
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Take the first step towards financial clarity.
            </h2>

            <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-xl mx-auto">
              Bring your financial activity together and build a clearer picture of your money.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                href={getAppUrl('/login')}
                variant="white"
                size="lg"
                icon={ArrowRight}
                className="w-full sm:w-auto font-bold text-slate-900 shadow-xl hover:bg-slate-100"
              >
                Get Started with finLab
              </Button>
              <a
                href={getAppUrl('/login')}
                className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white underline underline-offset-4 transition-colors"
              >
                Already have an account? Sign In
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

