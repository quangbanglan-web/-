import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`grid h-8 w-8 place-items-center rounded-md transition-colors ${
          theme === 'light' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
        title="Светлая тема"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('system')}
        className={`grid h-8 w-8 place-items-center rounded-md transition-colors ${
          theme === 'system' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
        title="Системная тема"
      >
        <Monitor className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`grid h-8 w-8 place-items-center rounded-md transition-colors ${
          theme === 'dark' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
        title="Темная тема"
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
};
