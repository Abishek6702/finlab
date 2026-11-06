'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { NAV_LINKS, getAppUrl, BRAND } from '../../lib/constants';
import Button from '../ui/Button';
import ThemeToggle from './ThemeToggle';
import Container from '../ui/Container';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)] shadow-xs'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <Container>
        <div className="flex h-16 sm:h-20 items-center justify-between">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-2 focus-visible:outline-[var(--primary)] rounded-lg p-1"
            aria-label={`${BRAND.name} Home`}
          >
            <div className="grid size-9 sm:size-10 place-items-center rounded-xl bg-gradient-to-tr from-[var(--primary)] to-sky-500 text-white font-extrabold shadow-sm shadow-[var(--primary)]/30 group-hover:scale-105 transition-transform">
              <span className="text-sm sm:text-base tracking-tighter">FL</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text)] leading-none">
                {BRAND.name}
              </span>
              <span className="text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase">
                Finance Lab
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main Navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)]/60 rounded-lg transition-colors focus-visible:outline-2"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            
            <a
              href={getAppUrl('/login')}
              className="px-4 py-2 text-sm font-semibold text-[var(--text)] hover:text-[var(--primary)] hover:bg-[var(--surface-raised)] rounded-xl transition-colors focus-visible:outline-2"
            >
              Sign In
            </a>

            <Button
              href={getAppUrl('/login')}
              variant="primary"
              size="sm"
              icon={ArrowRight}
              className="shadow-sm hover:shadow-md"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-raised)] focus-visible:outline-2"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] px-4 pt-3 pb-6 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-1.5" aria-label="Mobile Navigation">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 text-base font-medium text-[var(--text)] hover:bg-[var(--surface-raised)] rounded-xl transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-col gap-2.5">
              <a
                href={getAppUrl('/login')}
                className="w-full text-center py-2.5 text-sm font-semibold text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)] rounded-xl transition-colors"
              >
                Sign In
              </a>
              <Button
                href={getAppUrl('/login')}
                variant="primary"
                size="md"
                className="w-full justify-center"
                icon={ArrowRight}
              >
                Get Started – It&apos;s Free
              </Button>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}

