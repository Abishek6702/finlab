import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeContextBase';
const STORAGE_KEY = 'finlab-theme';

function readPreference() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'system') {
      localStorage.setItem(STORAGE_KEY, 'light');
      return 'light';
    }
    return value === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readPreference);
  const resolvedTheme = preference;
  const setPreference = useCallback((value) => {
    const next = value === 'dark' ? 'dark' : 'light';
    setPreferenceState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Storage unavailable */ }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    try { localStorage.setItem(STORAGE_KEY, preference); } catch { /* Storage may be unavailable. */ }
  }, [preference, resolvedTheme]);

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

