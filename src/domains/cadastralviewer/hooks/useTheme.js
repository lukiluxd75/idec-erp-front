import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'kiosk-theme';

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* noop */ }
}

function detectInitialTheme() {
  const saved = safeGet(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  try {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch { /* noop */ }
  return 'light';
}

// Manages light/dark theme with localStorage persistence.
export function useTheme() {
  const [theme, setTheme] = useState(detectInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    safeSet(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}