import { useEffect } from 'react';
import { Plus } from 'lucide-react';

export default function QuickActionDock({ onAdd }) {
  // Global keyboard shortcut: Press 'N' anywhere outside input to immediately render form
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        document.activeElement?.isContentEditable;

      if (!isInput && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        onAdd('expense');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAdd]);

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onAdd('expense')}
        aria-label="Add transaction (Press N)"
        className="group relative cursor-pointer flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5  active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
      >
        {/* Subtle breathing glow ring */}
        <span className="pointer-events-none absolute -inset-0.5 rounded-full bg-gradient-to-r from-[var(--primary)] to-sky-500 opacity-0 blur-xs transition-opacity duration-300  -z-10" />

        {/* Gradient Icon Badge */}
        <div className="grid size-6 place-items-center rounded-full bg-gradient-to-tr from-[var(--primary)] to-sky-500 text-white shadow-xs transition-transform duration-300 ">
          <Plus size={14} strokeWidth={2.5} />
        </div>

        {/* Text Label */}
        <span className="text-xs font-bold text-[var(--text)] tracking-tight group-hover:text-[var(--primary)] transition-colors">
          Add Transaction
        </span>

        
      </button>
    </div>
  );
}
