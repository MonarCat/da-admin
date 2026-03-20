// shared/theme.js
// D.A Theme System — import in both da-app and da-admin
// Usage: import { ThemeProvider, useTheme } from './theme';

import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'da_theme';

export const themes = {
  dark: {
    name: 'Dark',
    '--bg-primary':    '#0a0c10',
    '--bg-secondary':  '#111318',
    '--bg-card':       '#161a22',
    '--bg-hover':      '#1e2330',
    '--border':        '#252b3b',
    '--border-strong': '#2f3750',
    '--text-primary':  '#e8ecf5',
    '--text-secondary':'#8892a4',
    '--text-muted':    '#4a5568',
    '--accent':        '#3b82f6',
    '--accent-hover':  '#2563eb',
    '--accent-glow':   'rgba(59,130,246,0.15)',
    '--success':       '#10b981',
    '--warning':       '#f59e0b',
    '--danger':        '#ef4444',
    '--danger-glow':   'rgba(239,68,68,0.15)',
    '--purple':        '#8b5cf6',
    '--cyan':          '#06b6d4',
  },
  light: {
    name: 'Light',
    '--bg-primary':    '#f0f4ff',
    '--bg-secondary':  '#ffffff',
    '--bg-card':       '#ffffff',
    '--bg-hover':      '#f5f7ff',
    '--border':        '#e2e8f0',
    '--border-strong': '#cbd5e1',
    '--text-primary':  '#0f172a',
    '--text-secondary':'#475569',
    '--text-muted':    '#94a3b8',
    '--accent':        '#2563eb',
    '--accent-hover':  '#1d4ed8',
    '--accent-glow':   'rgba(37,99,235,0.1)',
    '--success':       '#059669',
    '--warning':       '#d97706',
    '--danger':        '#dc2626',
    '--danger-glow':   'rgba(220,38,38,0.1)',
    '--purple':        '#7c3aed',
    '--cyan':          '#0891b2',
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    const root = document.documentElement;
    const vars = themes[theme] || themes.dark;
    Object.entries(vars).forEach(([k, v]) => {
      if (k.startsWith('--')) root.style.setProperty(k, v);
    });
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  const set    = (t) => setTheme(t);

  return (
    <ThemeContext.Provider value={{ theme, toggle, set, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
