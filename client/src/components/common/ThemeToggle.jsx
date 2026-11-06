import { useTheme } from '../../hooks/useTheme';
import { Moon, Sun } from 'lucide-react';

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export default function ThemeToggle({ compact = false }) {
  const { preference, setPreference } = useTheme();
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0.5" role="group" aria-label="Color theme">
      {options.map(({ value, label, icon: Icon }) => (
        <button key={value} type="button" onClick={() => setPreference(value)}
          aria-label={`${label} theme`} aria-pressed={preference === value} title={label}
          className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border-0 px-2 text-xs transition-colors ${compact ? 'w-8 px-0 text-base' : 'px-2.5'} ${preference === value ? 'bg-[var(--surface-raised)] font-semibold text-[var(--text)]' : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'}`}>
          <Icon aria-hidden="true" size={compact ? 15 : 14} strokeWidth={1.8} />{!compact && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}
