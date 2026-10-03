import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ChevronDown,
  Maximize,
  Minimize,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Share2,
  Trash2,
  LoaderCircle,
  FileUp,
  Sun,
  Moon,
  User,
} from 'lucide-react';
import { PageData, ThemeType } from '../types/board';

export type BoardSaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';
export type ExportFormat = 'jpeg-low' | 'jpeg-medium' | 'png-ultra' | 'pdf' | 'svg';

interface BoardHeaderProps {
  subjectLabel: string;
  title: string;
  saveStatus: BoardSaveStatus;
  pages: PageData[];
  currentPageId: string;
  theme: ThemeType;
  zoom: number;
  isFullscreen: boolean;
  onBack: () => void;
  onRename: (title: string) => Promise<void>;
  onSave: () => void;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onDeletePage: (id: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpenSettings: () => void;
  onClearPage: () => void;
  onExport: (format: ExportFormat) => void;
  onShare: () => void;
  isPro: boolean;
  onOpenSubscription: () => void;
  onToggleFullscreen: () => void;
  isGuest?: boolean;
  onImportPdf?: () => void;
  onToggleTheme?: () => void;
}

const saveStatusText: Record<BoardSaveStatus, string> = {
  saved: 'Сохранено',
  saving: 'Сохраняем...',
  unsaved: 'Есть изменения',
  error: 'Ошибка сохранения',
};

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  subjectLabel,
  title,
  saveStatus,
  pages,
  currentPageId,
  theme,
  zoom,
  isFullscreen,
  onBack,
  onRename,
  onSave,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenSettings,
  onClearPage,
  onExport,
  onShare,
  isPro,
  onOpenSubscription,
  onToggleFullscreen,
  isGuest,
  onImportPdf,
  onToggleTheme,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const isDark = theme === 'chalkboard' || theme === 'blueprint';
  const currentIndex = Math.max(0, pages.findIndex((page) => page.id === currentPageId));
  const currentPage = pages[currentIndex];

  useEffect(() => setTitleDraft(title), [title]);

  const finishTitleEdit = async () => {
    const nextTitle = titleDraft.trim();
    try {
      if (nextTitle && nextTitle !== title) await onRename(nextTitle);
      else setTitleDraft(title);
      setIsEditingTitle(false);
    } catch {
      setTitleDraft(title);
      setIsEditingTitle(false);
    }
  };

  const buttonClass = `grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${
    isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-700 hover:bg-[#ece5d8] hover:text-slate-950'
  }`;

  return (
    <header className={`fixed left-2 right-2 top-2 z-20 rounded-2xl border px-3 py-2 shadow-xl backdrop-blur-xl sm:left-4 sm:right-4 sm:top-3 sm:px-4 ${isDark ? 'border-slate-800 bg-[#0f172a]/95 text-slate-100 shadow-slate-950/60' : 'border-[#e2d9cc] bg-[#fdfbf7]/95 text-[#1e293b] shadow-[0_6px_24px_rgba(40,30,20,0.08)]'}`} onPointerDown={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={onBack} title="Мои доски" className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#ece5d8]'}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Мои доски</span>
          </button>
          <span className={`hidden h-5 w-px sm:block ${isDark ? 'bg-slate-700' : 'bg-[#e2d9cc]'}`} />
          
          {isGuest ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
              <User className="h-3.5 w-3.5" />
              <span>Гостевой режим</span>
            </span>
          ) : (
            <span className="max-w-28 truncate rounded-md bg-emerald-800 px-2.5 py-1 text-[11px] font-bold text-white sm:max-w-40">{subjectLabel}</span>
          )}

          {isEditingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={() => void finishTitleEdit()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
                if (event.key === 'Escape') {
                  setTitleDraft(title);
                  setIsEditingTitle(false);
                }
              }}
              maxLength={100}
              aria-label="Название доски"
              className={`min-w-0 max-w-[42vw] rounded-lg border px-2.5 py-1 text-sm font-bold outline-none focus:border-emerald-600 sm:max-w-xs ${isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-[#d4c7b5] bg-white text-slate-900'}`}
            />
          ) : (
            <button onClick={() => setIsEditingTitle(true)} title="Изменить название доски" className={`group flex min-w-0 max-w-[48vw] items-center gap-1.5 rounded-lg px-2 py-1 text-left text-sm font-bold transition sm:max-w-sm ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#ece5d8]'}`}>
              <span className="truncate">{title}</span>
              <Pencil className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
            </button>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
          <div className="hidden items-center gap-1.5 px-2 text-xs sm:flex">
            {saveStatus === 'saved' && <Check className="h-3.5 w-3.5 text-emerald-600" />}
            {saveStatus === 'saving' && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-emerald-700" />}
            {saveStatus === 'unsaved' && <span className="h-2 w-2 rounded-full bg-amber-500" />}
            {saveStatus === 'error' && <AlertCircle className="h-3.5 w-3.5 text-rose-600" />}
            <span className={saveStatus === 'error' ? 'text-rose-600' : isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}>{saveStatusText[saveStatus]}</span>
          </div>
          <button onClick={onSave} title="Сохранить доску" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-800 px-3 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-900 active:scale-95">
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Сохранить</span>
          </button>

          {/* Import PDF/Presentation Button */}
          {onImportPdf && (
            <button
              type="button"
              onClick={onImportPdf}
              title="Импорт документа PDF / Презентации (PRO)"
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition active:scale-95 ${
                isDark
                  ? 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
                  : 'border-[#ded4c5] bg-white/80 text-slate-800 hover:bg-[#ece5d8]'
              }`}
            >
              <FileUp className="h-4 w-4 text-emerald-600" />
              <span className="hidden lg:inline">Импорт PDF</span>
              {!isPro && (
                <span className="rounded bg-gradient-to-r from-amber-400 to-amber-500 px-1 py-0.2 text-[9px] font-black text-slate-950">
                  PRO
                </span>
              )}
            </button>
          )}

          {/* Theme Quick Toggle (Classic School vs Steam Dark) */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={isDark ? "Светлая школьная тема («Классика»)" : "Тёмная тема («Steam Big Picture»)"}
              className={buttonClass}
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
            </button>
          )}

          <span className={`mx-1 hidden h-5 w-px md:block ${isDark ? 'bg-slate-700' : 'bg-[#e2d9cc]'}`} />

          <div className={`hidden items-center rounded-lg p-0.5 sm:flex ${isDark ? 'bg-slate-800' : 'bg-[#ece5d8]'}`}>
            <button onClick={() => onSelectPage(pages[Math.max(0, currentIndex - 1)]?.id || currentPageId)} disabled={currentIndex === 0} title="Предыдущий лист" className={`${buttonClass} h-8 w-8 disabled:opacity-30`}><ChevronLeft className="h-4 w-4" /></button>
            <span className="max-w-24 truncate px-1 text-[11px] font-semibold" title={currentPage?.title}>{currentPage?.title || `Лист ${currentIndex + 1}`}</span>
            <span className="whitespace-nowrap px-1 text-[10px] text-slate-500">{currentIndex + 1}/{pages.length}</span>
            <button onClick={() => onSelectPage(pages[Math.min(pages.length - 1, currentIndex + 1)]?.id || currentPageId)} disabled={currentIndex >= pages.length - 1} title="Следующий лист" className={`${buttonClass} h-8 w-8 disabled:opacity-30`}><ChevronRight className="h-4 w-4" /></button>
          </div>
          <button onClick={onAddPage} title="Добавить лист" className={buttonClass}><Plus className="h-4 w-4" /></button>
          <button onClick={() => onDeletePage(currentPageId)} disabled={pages.length <= 1} title="Удалить текущий лист" className={`${buttonClass} disabled:opacity-30 hover:text-rose-600`}><Trash2 className="h-4 w-4" /></button>
          <span className={`mx-1 hidden h-5 w-px md:block ${isDark ? 'bg-slate-700' : 'bg-[#e2d9cc]'}`} />

          <div className={`hidden items-center rounded-lg sm:flex ${isDark ? 'bg-slate-800' : 'bg-[#ece5d8]'}`}>
            <button onClick={onZoomOut} title="Уменьшить масштаб" className={`${buttonClass} h-8 w-8`}>−</button>
            <button onClick={onResetZoom} title="Сбросить масштаб" className="min-w-12 px-1 text-center text-[11px] font-semibold">{Math.round(zoom * 100)}%</button>
            <button onClick={onZoomIn} title="Увеличить масштаб" className={`${buttonClass} h-8 w-8`}>+</button>
          </div>
          <button onClick={onOpenSettings} title="Настройки доски" className={buttonClass}><Settings className="h-4 w-4" /></button>
          <div className="relative">
            <button onClick={() => setShowClearConfirm((visible) => !visible)} title="Очистить лист" className={`${buttonClass} hover:text-rose-600`}><RotateCcw className="h-4 w-4" /></button>
            {showClearConfirm && (
              <div className={`absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border p-3 shadow-xl ${isDark ? 'border-slate-700 bg-slate-900' : 'border-[#e2d9cc] bg-white'}`}>
                <p className="text-xs font-bold">Очистить текущий лист?</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setShowClearConfirm(false)} className="flex-1 rounded-lg py-1.5 text-xs hover:bg-slate-100">Отмена</button>
                  <button onClick={() => { onClearPage(); setShowClearConfirm(false); }} className="flex-1 rounded-lg bg-rose-600 py-1.5 text-xs font-bold text-white hover:bg-rose-700">Очистить</button>
                </div>
              </div>
            )}
          </div>
          <button onClick={onShare} title="Поделиться доской" className={buttonClass}>
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline text-xs font-semibold">Поделиться</span>
          </button>
          <div className="relative">
            <button onClick={() => setShowExportMenu((open) => !open)} title="Экспорт" aria-expanded={showExportMenu} className={buttonClass}><Download className="h-4 w-4" /><ChevronDown className="h-3 w-3" /></button>
            {showExportMenu && (
              <div className={`absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border p-1 shadow-xl ${isDark ? 'border-slate-700 bg-slate-900' : 'border-[#e2d9cc] bg-white'}`}>
                <button onClick={() => { onExport('jpeg-low'); setShowExportMenu(false); }} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800">JPEG · низкое качество</button>
                <button onClick={() => { onExport('jpeg-medium'); setShowExportMenu(false); }} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800">JPEG · среднее качество</button>
                {(['png-ultra', 'pdf', 'svg'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => {
                      setShowExportMenu(false);
                      if (isPro) onExport(format);
                      else onOpenSubscription();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>{format === 'png-ultra' ? 'PNG Ultra-HD' : format.toUpperCase() + (format === 'pdf' ? ' · весь урок' : '')}</span>
                    {!isPro && <span className="text-[9px] font-black text-amber-600">PRO</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onToggleFullscreen} title={isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'} className={buttonClass}>{isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}</button>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 sm:hidden">
        <div className="flex items-center gap-1">
          <button onClick={() => onSelectPage(pages[Math.max(0, currentIndex - 1)]?.id || currentPageId)} disabled={currentIndex === 0} title="Предыдущий лист" className="grid h-7 w-7 place-items-center rounded text-slate-500 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span className="max-w-36 truncate text-[11px] font-semibold">Лист {currentIndex + 1} / {pages.length}</span>
          <button onClick={() => onSelectPage(pages[Math.min(pages.length - 1, currentIndex + 1)]?.id || currentPageId)} disabled={currentIndex >= pages.length - 1} title="Следующий лист" className="grid h-7 w-7 place-items-center rounded text-slate-500 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className={`truncate text-[10px] font-medium ${saveStatus === 'error' ? 'text-rose-600' : 'text-slate-500'}`}>{saveStatusText[saveStatus]}</span>
          <div className="flex shrink-0 items-center rounded bg-slate-100">
          <button onClick={onZoomOut} title="Уменьшить масштаб" className="grid h-7 w-7 place-items-center text-slate-600">−</button>
          <button onClick={onResetZoom} title="Сбросить масштаб" className="min-w-10 text-center text-[11px] font-semibold text-slate-600">{Math.round(zoom * 100)}%</button>
          <button onClick={onZoomIn} title="Увеличить масштаб" className="grid h-7 w-7 place-items-center text-slate-600">+</button>
          </div>
        </div>
      </div>
    </header>
  );
};
