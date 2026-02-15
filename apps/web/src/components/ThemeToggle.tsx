'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const CYCLE: Theme[] = ['light', 'dark', 'system'];

export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();

  const next = () => {
    const idx = CYCLE.indexOf(theme);
    setTheme(CYCLE[(idx + 1) % CYCLE.length]!);
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';

  return (
    <button
      onClick={next}
      className={`text-muted hover:text-foreground hover:bg-hover flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        collapsed ? 'justify-center' : ''
      }`}
      title={collapsed ? `Theme: ${label}` : undefined}
    >
      <Icon size={20} strokeWidth={1.8} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
