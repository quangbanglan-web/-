import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { PageData, ThemeType } from '../types/board';

interface SlidesBarProps {
  pages: PageData[];
  currentPageId: string;
  theme: ThemeType;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onDeletePage: (id: string) => void;
}

export const SlidesBar: React.FC<SlidesBarProps> = ({
  pages,
  currentPageId,
  theme,
  onSelectPage,
  onAddPage,
  onDeletePage,
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isDark = theme === 'chalkboard' || theme === 'blueprint';

  const currentIndex = Math.max(
    0,
    pages.findIndex((p) => p.id === currentPageId)
  );

  const prevPage = () => {
    if (currentIndex > 0) {
      onSelectPage(pages[currentIndex - 1].id);
    }
  };

  const nextPage = () => {
    if (currentIndex < pages.length - 1) {
      onSelectPage(pages[currentIndex + 1].id);
    }
  };

  const handleDelete = () => {
    onDeletePage(currentPageId);
    setShowConfirmDelete(false);
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-2xl backdrop-blur-xl select-none ${
        isDark
          ? 'border-slate-700/80 bg-slate-950/85 text-slate-100'
          : 'border-slate-200/90 bg-white/90 text-slate-900'
      }`}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <button
        onClick={prevPage}
        disabled={currentIndex === 0}
        title="Предыдущий слайд"
        className={`grid h-8 w-8 place-items-center rounded-full transition disabled:opacity-30 ${
          isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
        }`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center px-2 font-medium text-xs tracking-wide">
        <span className="font-bold">Слайд {currentIndex + 1}</span>
        <span className="mx-1 opacity-50">из</span>
        <span className="font-bold">{pages.length}</span>
      </div>

      <button
        onClick={nextPage}
        disabled={currentIndex >= pages.length - 1}
        title="Следующий слайд"
        className={`grid h-8 w-8 place-items-center rounded-full transition disabled:opacity-30 ${
          isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
        }`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <span
        className={`h-4 w-px mx-1 ${
          isDark ? 'bg-slate-700' : 'bg-slate-200'
        }`}
      />

      <button
        onClick={onAddPage}
        title="Добавить лист"
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
          isDark
            ? 'bg-emerald-700/60 hover:bg-emerald-600/80 text-emerald-100'
            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
        }`}
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Лист</span>
      </button>

      {pages.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setShowConfirmDelete((prev) => !prev)}
            title="Удалить текущий лист"
            className={`grid h-8 w-8 place-items-center rounded-full text-rose-500 hover:bg-rose-500/10 transition`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {showConfirmDelete && (
            <div
              className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl border p-3 shadow-2xl backdrop-blur-xl ${
                isDark
                  ? 'border-slate-700 bg-slate-900 text-slate-100'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <p className="text-xs font-semibold text-center mb-2">
                Удалить слайд {currentIndex + 1}?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className={`flex-1 rounded-lg py-1 text-xs font-medium border ${
                    isDark
                      ? 'border-slate-700 hover:bg-slate-800'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-lg bg-rose-600 py-1 text-xs font-bold text-white hover:bg-rose-700 transition"
                >
                  Удалить
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
