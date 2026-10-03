import React, { useState } from 'react';
import {
  BookOpen, Calculator, Atom, Code2, Map, Landmark, Compass, Shapes,
  Settings, HelpCircle, Search, Plus, Home, LayoutGrid, Users, FileText, Archive,
  Star, Folder, ArrowUpRight, Crown,
  User as UserIcon
} from 'lucide-react';
import { User } from '../types/auth';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../utils/cn';

export interface DashboardSubject {
  id: string;
  label: string;
  description?: string;
}

export interface DashboardBoard {
  id: string;
  subject: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface DashboardProps {
  subjects: DashboardSubject[];
  selectedSubjectId: string;
  boards: DashboardBoard[];
  isLoading: boolean;
  currentUser?: User | null;
  onSelectSubject: (id: string) => void;
  onCreateBoard: () => void;
  onOpenBoard: (id: string) => void;
  onRenameBoard: (id: string, title: string) => Promise<void>;
  onDeleteBoard: (id: string) => Promise<void>;
  onAddSubject: (label: string) => void;
  onLogout?: () => void;
  onOpenSubscription?: () => void;
  onOpenAdmin?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  onOpenContacts?: () => void;
  onOpenAccountSettings?: () => void;
  onQuickStart?: (bg: import('../types/board').BoardBackground, subjectId?: string) => void;
  onOpenAuth?: () => void;
}

const formatDate = (value: string) => {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(normalized));
};

export const Dashboard: React.FC<DashboardProps> = ({
  boards,
  isLoading,
  currentUser,
  onCreateBoard,
  onOpenBoard,
  onOpenAccountSettings,
  onOpenSubscription,
  onQuickStart,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <main
      className={cn(
        "fixed inset-0 z-50 overflow-hidden flex flex-col font-sans transition-colors duration-300",
        isDark ? "bg-[#0b1120] text-slate-200" : "bg-[#fdfbf7] text-slate-800"
      )}
    >
      {/* HEADER */}
      <header
        className={cn(
          "flex h-20 shrink-0 items-center justify-between px-6 md:px-10 border-b",
          isDark ? "border-slate-800/50 bg-[#0f172a]/80 backdrop-blur-md" : "border-[#e7e2d9] bg-white/50 backdrop-blur-md"
        )}
      >
        <div className="flex items-center gap-8 w-1/3">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-2xl font-black tracking-widest",
              isDark ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" : "text-slate-800"
            )}>
              {isDark ? 'DOSKA' : 'ДОСКА'}
            </span>
          </div>
        </div>

        <div className="flex flex-1 justify-center max-w-lg">
          <div className={cn(
            "flex w-full items-center gap-2 rounded-full px-4 py-2.5 transition-all",
            isDark
              ? "bg-slate-900/50 border border-slate-700/50 focus-within:border-cyan-500/50 focus-within:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
              : "bg-white border border-[#e7e2d9] focus-within:border-emerald-400 focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"
          )}>
            <Search className={cn("h-4 w-4", isDark ? "text-slate-400" : "text-slate-400")} />
            <input
              type="text"
              placeholder={isDark ? "Search boards..." : "Поиск"}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 w-1/3">
          <ThemeToggle />

          {currentUser ? (
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full pr-3 pl-1 py-1 cursor-pointer transition-colors",
                  isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-100"
                )}
                onClick={onOpenAccountSettings}
              >
                <div className={cn(
                  "grid h-8 w-8 place-items-center rounded-full shadow-sm ring-2",
                  isDark ? "bg-slate-800 ring-cyan-500/50 text-cyan-400" : "bg-emerald-100 ring-white text-emerald-700"
                )}>
                  {currentUser.name ? currentUser.name[0].toUpperCase() : <UserIcon className="h-4 w-4" />}
                </div>
                <span className={cn("text-sm font-semibold hidden md:block", isDark ? "text-slate-200" : "text-slate-700")}>
                  {currentUser.name || (isDark ? 'User' : 'Пользователь')}
                </span>
              </div>
              
              <button
                type="button"
                onClick={onOpenSubscription}
                className={cn(
                  "hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition",
                  isDark
                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 hover:brightness-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                    : "bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200"
                )}
              >
                PRO
              </button>

              <button
                type="button"
                onClick={onOpenAccountSettings}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full transition",
                  isDark ? "bg-slate-800 text-slate-400 hover:text-cyan-400" : "bg-white border border-[#e7e2d9] text-slate-500 hover:text-emerald-700 hover:bg-slate-50"
                )}
              >
                <Settings className="h-4 w-4" />
                {isDark ? null : <span className="sr-only">Настройки</span>}
              </button>

              {!isDark && (
                <button
                  type="button"
                  className="hidden md:flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
                >
                  <HelpCircle className="h-4 w-4" />
                  Помощь
                </button>
              )}
            </div>
          ) : (
            <div className="text-sm">Guest Mode</div>
          )}
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside
          className={cn(
            "w-64 shrink-0 flex flex-col gap-2 p-6 overflow-y-auto",
            isDark ? "" : "border-r border-[#e7e2d9]"
          )}
        >
          {isDark ? (
            // DARK SIDEBAR
            <nav className="flex flex-col gap-4">
              {[
                { label: 'Clean Board', icon: BookOpen, action: () => onQuickStart?.('clean') },
                { label: 'Math Grid', icon: Calculator, action: () => onQuickStart?.('math_grid') },
                { label: 'Ruled Paper', icon: FileText, action: () => onQuickStart?.('ruled') },
                { label: 'Favorites', icon: Star, action: () => {} },
                { label: 'Gallery', icon: Folder, action: () => {} },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.action}
                  className="group relative flex h-14 items-center gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/30 px-4 text-left font-medium text-slate-300 transition-all hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 transition-all group-hover:from-cyan-500/10 group-hover:to-indigo-500/10" />
                  <item.icon className="relative z-10 h-5 w-5" />
                  <span className="relative z-10">{item.label}</span>
                </button>
              ))}
            </nav>
          ) : (
            // LIGHT SIDEBAR
            <nav className="flex flex-col gap-1">
              {[
                { label: 'Главная', icon: Home, active: true },
                { label: 'Мои доски', icon: LayoutGrid },
                { label: 'Классы', icon: Users },
                { label: 'Материалы', icon: Folder },
                { label: 'Архив', icon: Archive },
              ].map((item, idx) => (
                <button
                  key={idx}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                    item.active
                      ? "bg-[#efece5] text-slate-900"
                      : "text-slate-600 hover:bg-slate-100/50 hover:text-slate-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          )}
        </aside>

        {/* MAIN CONTENT */}
        <section className="flex-1 overflow-y-auto p-6 md:p-10 relative">
          <div className="mx-auto max-w-6xl h-full flex flex-col">
            <h1 className={cn(
              "mb-8 text-xl font-bold uppercase tracking-widest",
              isDark ? "text-slate-300 drop-shadow-sm" : "text-slate-800 tracking-normal capitalize text-2xl"
            )}>
              {isDark ? 'CONTINUE WHERE YOU LEFT OFF' : 'МОИ ДОСКИ'}
            </h1>

            {isLoading ? (
              <div className="py-20 text-center text-slate-500">Загрузка...</div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {boards.length > 0 ? boards.map((board, idx) => (
                  <article
                    key={board.id}
                    onClick={() => onOpenBoard(board.id)}
                    className={cn(
                      "group relative flex cursor-pointer flex-col overflow-hidden transition-all duration-300",
                      isDark
                        ? "h-64 rounded-3xl bg-slate-900 border border-slate-700/60 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)]"
                        : "min-h-[220px] rounded-xl bg-white border border-[#e7e2d9] shadow-sm hover:shadow-md hover:border-slate-300 p-4"
                    )}
                  >
                    {isDark ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80 z-10" />
                        <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop')] bg-cover bg-center" />
                        <div className="relative z-20 flex h-full flex-col justify-end p-5">
                          <h3 className="mb-1 text-lg font-bold text-white drop-shadow-md">{board.title}</h3>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-300">{formatDate(board.updated_at)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 flex flex-col">
                          <div className="h-28 w-full rounded-md border border-slate-200 bg-[url('https://www.transparenttextures.com/patterns/lined-paper.png')] bg-[#fff] mb-4 overflow-hidden relative" />
                          <h3 className="text-base font-bold text-slate-800 line-clamp-2 leading-tight mb-1">{board.title}</h3>
                          <p className="text-xs text-slate-500 mb-4">{board.subject} • {formatDate(board.updated_at)}</p>
                          <button className="mt-auto w-full rounded-lg bg-[#efece5] py-2 text-sm font-semibold text-slate-700 transition group-hover:bg-[#e2dfd7]">
                            Открыть доску
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                )) : (
                  <div className="col-span-full py-20 text-center text-slate-500">
                    Нет активных досок
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className={cn("mt-auto pt-8 flex items-center", isDark ? "gap-4" : "justify-center")}>
              <button
                onClick={onCreateBoard}
                className={cn(
                  "inline-flex items-center justify-center gap-2 font-bold transition-all active:scale-95",
                  isDark
                    ? "rounded-full bg-slate-900 border border-indigo-500/50 px-8 py-4 text-sm text-indigo-100 hover:bg-indigo-950 hover:border-indigo-400 hover:shadow-[0_0_25px_rgba(99,102,241,0.3)] shadow-lg"
                    : "rounded-xl bg-emerald-500 px-8 py-3 text-base text-white hover:bg-emerald-600 shadow-sm"
                )}
              >
                <Plus className={cn("h-5 w-5", isDark ? "text-cyan-400" : "")} />
                {isDark ? 'CREATE NEW BOARD' : 'Новая доска'}
              </button>

              {isDark && (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-800/80 border border-slate-700 px-8 py-4 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-lg active:scale-95"
                >
                  <LayoutGrid className="h-5 w-5" />
                  ALL BOARDS
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
