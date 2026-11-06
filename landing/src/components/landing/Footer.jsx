import Link from 'next/link';
import Container from '../ui/Container';
import { BRAND, getAppUrl } from '../../lib/constants';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] py-12 sm:py-16">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 pb-12 border-b border-[var(--border)]">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="grid size-8 place-items-center rounded-xl bg-gradient-to-tr from-[var(--primary)] to-sky-500 text-white font-extrabold shadow-sm">
                <span className="text-xs tracking-tighter">FL</span>
              </div>
              <span className="text-lg font-bold text-[var(--text)] tracking-tight">
                {BRAND.name}
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed font-medium">
              &ldquo;{BRAND.tagline}&rdquo;
            </p>

            <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
              An intelligent, single-workspace personal finance SaaS engineered to help you organize bank accounts, track expenses, and plan budgets with confidence.
            </p>
          </div>

          {/* Product Navigation */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] mb-4">
              Navigation
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="#" className="hover:text-[var(--text)] transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[var(--text)] transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[var(--text)] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#benefits" className="hover:text-[var(--text)] transition-colors">
                  Benefits
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[var(--text)] transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Account & Legal */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] mb-4">
              Account & Legal
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href={getAppUrl('/login')} className="hover:text-[var(--text)] transition-colors">
                  Sign In
                </a>
              </li>
              <li>
                <a href={getAppUrl('/login')} className="hover:text-[var(--text)] transition-colors">
                  Create Account
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-[var(--text)] transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-[var(--text)] transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <p>© {currentYear} {BRAND.name}. All rights reserved. Free personal finance management software.</p>
          <p className="font-mono text-[11px]">finLab v2.0 • Production Quality</p>
        </div>
      </Container>
    </footer>
  );
}

