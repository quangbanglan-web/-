import React, { useState } from 'react';
import {
  Atom,
  ArrowUpRight,
  BookOpen,
  Calculator,
  Check,
  Code2,
  Compass,
  Crown,
  FilePlus2,
  Landmark,
  LogOut,
  Map,
  Pencil,
  Plus,
  Shapes,
  Shield,
  Sparkles,
  Trash2,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react';
import { User } from '../types/auth';
import { Footer } from './Footer';

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
}

const subjectIcons = [Calculator, Atom, Code2, Map, Landmark, Compass, Shapes];
const subjectAccents = [
  'text-emerald-700 bg-emerald-50 border-emerald-200',
  'text-cyan-700 bg-cyan-50 border-cyan-200',
  'text-amber-700 bg-amber-50 border-amber-200',
  'text-rose-700 bg-rose-50 border-rose-200',
  'text-indigo-700 bg-indigo-50 border-indigo-200',
  'text-teal-700 bg-teal-50 border-teal-200',
  'text-orange-700 bg-orange-50 border-orange-200',
];

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

const boardCountLabel = (count: number) => {
  const lastTwo = count % 100;
  const last = count % 10;
  const noun = lastTwo >= 11 && lastTwo <= 14
    ? 'досок'
    : last === 1
      ? 'доска'
      : last >= 2 && last <= 4
        ? 'доски'
        : 'досок';
  return `${count} ${noun}`;
};

export const Dashboard: React.FC<DashboardProps> = ({
  subjects,
  selectedSubjectId,
  boards,
  isLoading,
  currentUser,
  onSelectSubject,
  onCreateBoard,
  onOpenBoard,
  onRenameBoard,
  onDeleteBoard,
  onAddSubject,
  onLogout,
  onOpenSubscription,
  onOpenAdmin,
  onOpenTerms,
  onOpenPrivacy,
  onOpenContacts,
}) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [renamingBoard, setRenamingBoard] = useState<{ id: string; title: string } | null>(null);
  const [renameError, setRenameError] = useState('');
  const [actionError, setActionError] = useState('');
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) || subjects[0];

  const submitNewSubject = (event: React.FormEvent) => {
    event.preventDefault();
    const label = newSubjectName.trim();
    if (!label) return;
    if (subjects.some((subject) => subject.label.toLocaleLowerCase() === label.toLocaleLowerCase())) {
      setSubjectError('Такой предмет уже добавлен');
      return;
    }
    onAddSubject(label);
    setNewSubjectName('');
    setSubjectError('');
  };

  const submitRename = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!renamingBoard?.title.trim()) return;
    try {
      await onRenameBoard(renamingBoard.id, renamingBoard.title.trim());
      setRenamingBoard(null);
      setRenameError('');
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : 'Не удалось переименовать доску');
    }
  };

  const deleteBoard = async (id: string, title: string) => {
    if (!window.confirm(`Удалить доску «${title}»?`)) return;
    try {
      await onDeleteBoard(id);
      setActionError('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Не удалось удалить доску');
    }
  };

  return (
    <main className="fixed inset-0 z-50 overflow-y-auto bg-[#f2f6f3] text-slate-900">
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(16,94,76,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(16,94,76,0.045)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative mx-auto min-h-full max-w-7xl px-5 py-6 pb-24 md:px-9 md:py-9 md:pb-28">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-800 text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-wide text-emerald-950">ДОСКА</p>
              <p className="text-xs text-slate-500">Локальное рабочее пространство</p>
            </div>
          </div>

          {currentUser ? (
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Buy PRO Header Button (hidden if already PRO) */}
              {onOpenSubscription && !currentUser.is_pro && (
                <button
                  type="button"
                  onClick={onOpenSubscription}
                  title="Оформить PRO подписку без рекламы"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 px-3 py-2 text-xs font-black text-slate-950 shadow-sm transition hover:brightness-105 active:scale-95"
                >
                  <Crown className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
                  <span className="hidden sm:inline">Купить PRO — 99 ₽</span>
                  <span className="sm:hidden">PRO — 99 ₽</span>
                </button>
              )}

              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-950/10 bg-white/70 px-3 py-1.5 shadow-sm">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-800 text-xs font-bold text-white shadow-xs">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : <UserIcon className="h-4 w-4" />}
                </span>
                <div className="flex flex-col">
                  <span className="max-w-36 truncate text-xs font-bold text-slate-900 sm:max-w-64" title={currentUser.name}>
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500">{currentUser.email}</span>
                </div>

                {currentUser.is_pro ? (
                  <span
                    title="PRO подписка активна: без рекламы и пауз"
                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-2 py-0.5 text-[10px] font-black text-amber-950 shadow-xs"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    PRO
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenSubscription}
                    title="Тариф FREE. Нажмите, чтобы отключить рекламу и получить PRO"
                    className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 transition hover:bg-amber-100 hover:text-amber-900"
                  >
                    FREE
                  </button>
                )}
              </div>

              {/* Admin Panel Button (only if user.role === 'admin') */}
              {currentUser.role === 'admin' && onOpenAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  title="Панель администратора"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-900 shadow-sm transition hover:border-purple-300 hover:bg-purple-100 active:scale-95"
                >
                  <Shield className="h-3.5 w-3.5 text-purple-700" />
                  <span>Админка</span>
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Выйти из аккаунта"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 active:scale-95"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Выйти</span>
                </button>
              )}
            </div>
          ) : (
            <span className="hidden text-xs font-medium text-slate-500 sm:block">Уроки и материалы</span>
          )}
        </header>

        <div className="mb-7 mt-8 max-w-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">Главное меню</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Рабочие доски</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Выберите предмет, чтобы открыть урок или продолжить работу.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside aria-label="Предметы" className="lg:border-r lg:border-emerald-950/10 lg:pr-6">
            <h2 className="mb-3 px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Предметы</h2>
            <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {subjects.map((subject, index) => {
                const SubjectIcon = subjectIcons[index % subjectIcons.length];
                const isSelected = subject.id === selectedSubjectId;
                return (
                  <button
                    key={subject.id}
                    onClick={() => onSelectSubject(subject.id)}
                    className={`flex shrink-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition lg:w-full ${
                      isSelected
                        ? 'border-emerald-900 bg-emerald-900 text-white shadow-sm'
                        : 'border-transparent bg-white/60 text-slate-700 hover:border-emerald-900/15 hover:bg-white'
                    }`}
                  >
                    <SubjectIcon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{subject.label}</span>
                    {isSelected && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-lime-300 lg:block" />}
                  </button>
                );
              })}
            </nav>

            <form onSubmit={submitNewSubject} className="mt-4 border-t border-emerald-950/10 pt-4">
              <label htmlFor="new-subject" className="mb-2 block px-1 text-xs font-semibold text-slate-600">Добавить свой предмет</label>
              <div className="flex gap-1.5">
                <input
                  id="new-subject"
                  value={newSubjectName}
                  onChange={(event) => setNewSubjectName(event.target.value)}
                  placeholder="Название предмета"
                  maxLength={48}
                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                />
                <button type="submit" title="Добавить предмет" className="grid w-10 shrink-0 place-items-center rounded-md bg-emerald-800 text-white transition hover:bg-emerald-900">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {subjectError && <p className="mt-2 text-xs text-rose-700">{subjectError}</p>}
            </form>
          </aside>

          <section className="min-w-0">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-emerald-950/10 pb-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Выбранный предмет</span>
                  <span className="rounded-sm bg-white/80 px-2 py-0.5 text-xs font-bold text-emerald-900">{boardCountLabel(boards.length)}</span>
                </div>
                <h2 className="text-2xl font-bold">{selectedSubject?.label}</h2>
              </div>
              <button
                onClick={onCreateBoard}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
              >
                <FilePlus2 className="h-4 w-4" />
                <span>Создать новый урок</span>
              </button>
            </div>
            {actionError && <p role="alert" className="mb-4 text-sm text-rose-700">{actionError}</p>}

            {isLoading ? (
              <div className="py-16 text-center text-sm text-slate-500">Загружаем доски...</div>
            ) : boards.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {boards.map((board, index) => {
                  const accent = subjectAccents[subjects.findIndex((subject) => subject.id === board.subject) % subjectAccents.length] || subjectAccents[index % subjectAccents.length];
                  return (
                    <article
                      key={board.id}
                      onClick={() => onOpenBoard(board.id)}
                      className="group flex min-h-48 flex-col rounded-lg border border-slate-200 bg-white/90 p-4 shadow-[0_2px_10px_rgba(15,55,43,0.04)] transition hover:border-emerald-900/30 hover:shadow-[0_8px_24px_rgba(15,55,43,0.09)] cursor-pointer"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${accent}`}>
                          <BookOpen className="h-4 w-4" />
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                          {formatDate(board.updated_at)}
                        </span>
                      </div>
                      <h3 className="mb-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-900 group-hover:text-emerald-900 transition-colors">{board.title}</h3>
                      <p className="mb-4 text-xs text-slate-500">Создана {formatDate(board.created_at)}</p>
                      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenBoard(board.id);
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-900"
                        >
                          Открыть <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameError('');
                            setRenamingBoard({ id: board.id, title: board.title });
                          }}
                          title="Переименовать"
                          className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:border-emerald-700 hover:text-emerald-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteBoard(board.id, board.title);
                          }}
                          title="Удалить"
                          className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center border-y border-dashed border-emerald-950/20 px-6 py-10 text-center">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-white text-emerald-800 shadow-sm">
                  <BookOpen className="h-5 w-5" />
                </span>
                <h3 className="text-base font-bold">Пока нет досок по предмету «{selectedSubject?.label}»</h3>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Создайте первый урок. Доска появится здесь после сохранения.</p>
                <button onClick={onCreateBoard} className="mt-5 inline-flex items-center gap-2 rounded-md border border-emerald-800 px-3.5 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50">
                  <Plus className="h-4 w-4" /> Создать доску
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Footer with legal requisites, payment logos and links */}
        {onOpenTerms && onOpenPrivacy && onOpenContacts && (
          <Footer
            onOpenTerms={onOpenTerms}
            onOpenPrivacy={onOpenPrivacy}
            onOpenContacts={onOpenContacts}
            className="mt-12 rounded-2xl border border-emerald-950/10 shadow-xs"
          />
        )}
      </div>

      {renamingBoard && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget) setRenamingBoard(null); }}>
          <form onSubmit={submitRename} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">Переименовать доску</h2>
              <button type="button" onClick={() => setRenamingBoard(null)} title="Закрыть" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <input autoFocus value={renamingBoard.title} onChange={(event) => setRenamingBoard({ ...renamingBoard, title: event.target.value })} maxLength={100} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" />
            {renameError && <p className="mt-2 text-xs text-rose-700">{renameError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRenamingBoard(null)} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Отмена</button>
              <button type="submit" disabled={!renamingBoard.title.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-800 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-50"><Check className="h-4 w-4" /> Сохранить</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};
