import React, { useState } from 'react';
import { PageData, ThemeType, SubjectMode } from '../types/board';
import {
  Plus,
  Trash2,
  Download,
  Maximize,
  Minimize,
  RotateCcw,
  FunctionSquare,
  Compass,
  ArrowLeft,
  Grid,
  ChevronUp,
  Settings,
} from 'lucide-react';

interface PageBarProps {
  pages: PageData[];
  currentPageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onDeletePage: (id: string) => void;
  onClearPage: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  theme: ThemeType;
  onExportPNG: () => void;
  onOpenSettings: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  // Subject & Hub
  subjectMode: SubjectMode;
  onSwitchSubject: (mode: SubjectMode) => void;
  onOpenHub: () => void;
  // Geometry Snap
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  // Collapse
  onCollapse: () => void;
}

export const PageBar: React.FC<PageBarProps> = ({
  pages,
  currentPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onClearPage,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  theme,
  onExportPNG,
  onOpenSettings,
  isFullscreen,
  onToggleFullscreen,
  subjectMode,
  onSwitchSubject,
  onOpenHub,
  snapToGrid,
  onToggleSnapToGrid,
  onCollapse,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const isDark = theme === 'chalkboard' || theme === 'blueprint';

  return (
    <header
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className={`fixed top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 px-3 py-2 rounded-2xl shadow-xl backdrop-blur-xl border select-none transition-all ${
        isDark
          ? 'bg-slate-900/95 border-slate-700/80 shadow-slate-950/40 text-slate-100'
          : 'bg-white/95 border-slate-200/80 shadow-slate-900/10 text-slate-800'
      }`}
    >
      {/* Left: Hub Switcher, Subject Mode Pill & Page Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {/* Back to Hub button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenHub();
          }}
          title="Вернуться к выбору предметов (Главная)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Предметы</span>
        </button>

        {/* Subject Mode Switcher Badge */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl p-0.5 text-xs font-bold">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSwitchSubject('algebra');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
              subjectMode === 'algebra'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FunctionSquare className="w-3.5 h-3.5" />
            <span>Алгебра</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSwitchSubject('geometry');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
              subjectMode === 'geometry'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Геометрия</span>
          </button>
        </div>

        {/* Geometry Snap to Grid Toggle */}
        {subjectMode === 'geometry' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSnapToGrid();
            }}
            title={snapToGrid ? 'Привязка к сетке ВКЛЮЧЕНА (нажмите, чтобы выключить)' : 'Привязка к сетке ВЫКЛЮЧЕНА'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              snapToGrid
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Сетка: {snapToGrid ? 'ВКЛ' : 'ВЫКЛ'}</span>
          </button>
        )}

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Page Switcher Tabs */}
        <div className="flex items-center gap-1.5">
          {pages.map((page, idx) => (
            <div
              key={page.id}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                page.id === currentPageId
                  ? subjectMode === 'geometry'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                    : 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
              }`}
              onClick={() => onSelectPage(page.id)}
            >
              <span>{page.title || `Стр. ${idx + 1}`}</span>

              {pages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(page.id);
                  }}
                  title="Удалить страницу"
                  className={`p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/20 transition ${
                    page.id === currentPageId ? 'text-white' : 'text-slate-400 hover:text-red-500'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Add Page Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddPage();
            }}
            title="Добавить страницу урока"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Страница</span>
          </button>
        </div>
      </div>

      {/* Right: Zoom, Settings (Themes here), Export, Clear, Fullscreen, Collapse */}
      <div className="flex items-center gap-1.5">
        {/* Zoom controls */}
        <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl p-0.5 text-xs font-mono">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onZoomOut();
            }}
            title="Уменьшить масштаб"
            className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
          >
            -
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResetZoom();
            }}
            title="Сброс масштаба к 100%"
            className="px-2 py-1 text-[11px] font-medium hover:bg-white dark:hover:bg-slate-700 transition"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onZoomIn();
            }}
            title="Увеличить масштаб"
            className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
          >
            +
          </button>
        </div>

        {/* Settings button (Themes are selected in Settings) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings();
          }}
          title="Настройки доски (тема, клетка, сглаживание)"
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition flex items-center gap-1"
        >
          <Settings className="w-4 h-4" />
          <span className="text-xs font-medium hidden xl:inline">Тема и сетка</span>
        </button>

        {/* Clear Page button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowClearConfirm(true);
            }}
            title="Очистить текущую страницу"
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {showClearConfirm && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-40 w-52 flex flex-col gap-2"
            >
              <span className="text-xs font-bold leading-tight">Очистить лист?</span>
              <span className="text-[11px] text-slate-400">Все линии на странице будут стёрты.</span>
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-1 text-xs font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    onClearPage();
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-1 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
                >
                  Очистить
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export to PNG */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExportPNG();
          }}
          title="Скачать изображение страницы (PNG)"
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFullscreen();
          }}
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* Collapse Button (Скрыть панель) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCollapse();
          }}
          title="Скрыть верхнюю панель для расширения рабочего пространства"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition"
        >
          <ChevronUp className="w-4 h-4" />
          <span className="hidden md:inline">Скрыть</span>
        </button>
      </div>
    </header>
  );
};
