'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

function applyThemeToDocument(mode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
  } else {
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
  }
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let saved = 'light';
    try {
      const stored = localStorage.getItem('finlab-theme');
      saved = stored === 'dark' ? 'dark' : 'light';
      // Clean up legacy 'system' if present
      if (stored === 'system') {
        localStorage.setItem('finlab-theme', 'light');
      }
    } catch {
      saved = 'light';
    }

    applyThemeToDocument(saved);
    const timer = setTimeout(() => {
      setTheme(saved);
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('finlab-theme', next);
    } catch { /* Storage unavailable */ }
    applyThemeToDocument(next);
  };

  if (!mounted) {
    return (
      <div className={`size-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 ${className}`} />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative inline-flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-colors focus-visible:outline-2 ${className}`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme (currently ${theme})`}
      title={`Theme: ${theme === 'dark' ? 'Dark' : 'Light'} (Click to switch)`}
    >
      {theme === 'dark' ? (
        <Moon className="size-4 text-sky-400" />
      ) : (
        <Sun className="size-4 text-amber-500" />
      )}
    </button>
  );
}
