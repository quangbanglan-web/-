import React from 'react';
import { X, Sliders, Sparkles, Check } from 'lucide-react';
import { ThemeType } from '../types/board';
import { SmoothingLevel } from '../utils/strokeSmoother';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeType;
  onChangeTheme: (theme: ThemeType) => void;
  baseCellSize: number;
  onChangeCellSize: (size: number) => void;
  palmRejection: boolean;
  onTogglePalmRejection: () => void;
  autoFormatEnabled: boolean;
  onToggleAutoFormat: () => void;
  smoothingLevel: SmoothingLevel;
  onChangeSmoothingLevel: (level: SmoothingLevel) => void;
  snapShapes: boolean;
  onToggleSnapShapes: () => void;
  onResetToolbarPos: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onChangeTheme,
  baseCellSize,
  onChangeCellSize,
  palmRejection,
  onTogglePalmRejection,
  autoFormatEnabled,
  onToggleAutoFormat,
  smoothingLevel,
  onChangeSmoothingLevel,
  snapShapes,
  onToggleSnapShapes,
  onResetToolbarPos,
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'chalkboard' || theme === 'blueprint';

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh] ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${
            isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base">Настройки доски</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 overflow-y-auto">
          {/* 1. Theme selector (Unified here) */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Тема оформления доски:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'notebook', label: 'Тетрадь в клетку', desc: 'Классический школьный лист с полями', bg: '#fdfbf7', border: '#ccd9ed' },
                { id: 'chalkboard', label: 'Классная доска', desc: 'Мягкий естественный зеленый фон', bg: '#25443a', border: '#3a6154' },
                { id: 'clean', label: 'Чистый белый', desc: '100% белоснежный лист без сетки', bg: '#ffffff', border: '#e2e8f0' },
                { id: 'blueprint', label: 'Инженерная', desc: 'Темно-синий чертежный фон', bg: '#0f172a', border: '#1e293b' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => onChangeTheme(t.id as ThemeType)}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition ${
                    theme === t.id
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm font-semibold'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div
                    style={{ backgroundColor: t.bg, borderColor: t.border }}
                    className="w-5 h-5 rounded-full border shadow-inner flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold">{t.label}</div>
                    <div className="text-[10px] text-slate-400 leading-snug">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Grid cell size */}
          {theme !== 'clean' && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Размер клетки сетки:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { size: 24, label: 'Мелкая (24px)' },
                  { size: 32, label: 'Стандарт (32px)' },
                  { size: 40, label: 'Крупная (40px)' },
                ].map((s) => (
                  <button
                    key={s.size}
                    onClick={() => onChangeCellSize(s.size)}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition ${
                      baseCellSize === s.size
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Stroke Smoothing & Auto-Beautification Section */}
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-blue-50/50 border-blue-100'}`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold">Сглаживание и автовыравнивание линий</span>
              </div>
              <button
                onClick={onToggleAutoFormat}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                  autoFormatEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Устраняет мелкое дрожание пальца на стекле планшета, срезает случайные хвостики отрыва и делает кривые ровными, сохраняя чёткие углы у цифр и знаков.
            </p>

            {/* Smoothing Level Selection */}
            {autoFormatEnabled && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Степень сглаживания:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'aggressive',
                      label: '⚡ Агрессивное (для пальца)',
                      desc: 'Максимальная фильтрация дрожания и автовыпрямление линий',
                    },
                    {
                      id: 'strong',
                      label: '🔥 Сильное',
                      desc: 'Плавные каллиграфические дуги и мягкие скругления',
                    },
                    {
                      id: 'medium',
                      label: '🌿 Оптимальное',
                      desc: 'Естественный ровный почерк',
                    },
                    {
                      id: 'light',
                      label: '🪶 Мягкое',
                      desc: 'Минимальная фильтрация микро-дрожания',
                    },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => onChangeSmoothingLevel(lvl.id as SmoothingLevel)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        smoothingLevel === lvl.id
                          ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-300 font-semibold ring-1 ring-blue-500/50'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight mb-1">{lvl.label}</div>
                      <div className="text-[10px] text-slate-400 leading-snug">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Snap Shapes */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold block">Выравнивание геометрических линий и окружностей</span>
                <span className="text-[10px] text-slate-400 block leading-tight">
                  Автоматически делает нарисованные от руки линии прямыми, а окружности — круглыми.
                </span>
              </div>
              <button
                onClick={onToggleSnapShapes}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                  snapShapes ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>
          </div>

          {/* 4. Tablet Palm Rejection */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold block">Режим стилуса (Palm Rejection)</span>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  По умолчанию выключен (пишет и палец, и стилус). Если включить — пишет только стилус, а пальцами можно двигать холст.
                </span>
              </div>
              <button
                onClick={onTogglePalmRejection}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                  palmRejection ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>
          </div>

          {/* 5. Reset Toolbar Position */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold block">Положение панели инструментов</span>
              <span className="text-[11px] text-slate-400 block leading-tight">
                Панель можно свободно перетаскивать за ручку в любое место.
              </span>
            </div>
            <button
              onClick={onResetToolbarPos}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              Сбросить в центр
            </button>
          </div>
        </div>

        <div
          className={`px-5 py-3 border-t flex justify-end ${
            isDark ? 'border-slate-800 bg-slate-800/30' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
