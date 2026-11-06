import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  PieChart,
  Target,
  CalendarClock,
  Tags,
  TrendingUp,
} from 'lucide-react';
import Container from '../ui/Container';
import SectionHeading from '../ui/SectionHeading';
import { FEATURES } from '../../lib/constants';

const ICON_MAP = {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  PieChart,
  Target,
  CalendarClock,
  Tags,
  TrendingUp,
};

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 lg:py-32 scroll-mt-20">
      <Container>
        <SectionHeading
          badge="Product Capabilities"
          title="Everything you need to understand your money."
          description="A complete suite of personal finance tools built with the precision of accounting software and the clarity of modern design."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature) => {
            const Icon = ICON_MAP[feature.icon] || LayoutDashboard;
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[var(--primary)]/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="grid size-12 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] group-hover:scale-105 transition-transform">
                      <Icon className="size-6" />
                    </div>
                    <span className="rounded-md bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
                    {feature.title}
                  </h3>

                  <p className="mt-2.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center text-xs font-semibold text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Explore feature details →</span>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

