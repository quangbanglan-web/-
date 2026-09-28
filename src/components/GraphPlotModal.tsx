import React, { useState } from 'react';
import { X, LineChart, Plus } from 'lucide-react';
import { ThemeType } from '../types/board';

interface GraphPlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertGraph: (formula: string, color: string) => void;
  theme: ThemeType;
}

const PRESET_FUNCTIONS = [
  { label: 'Парабола: y = x²', formula: 'x^2', color: '#2563eb' },
  { label: 'Квадратичная: y = x² - 4', formula: 'x^2 - 4', color: '#7c3aed' },
  { label: 'Прямая: y = 2x - 1', formula: '2*x - 1', color: '#059669' },
  { label: 'Синусоида: y = sin(x)', formula: 'sin(x)', color: '#dc2626' },
  { label: 'Косинусоида: y = cos(x)', formula: 'cos(x)', color: '#ea580c' },
  { label: 'Гипербола: y = 1/x', formula: '1/x', color: '#0284c7' },
  { label: 'Кубическая: y = x³ - 3x', formula: 'x^3 - 3*x', color: '#4f46e5' },
  { label: 'Модуль: y = |x| - 2', formula: 'abs(x) - 2', color: '#d97706' },
];

export const GraphPlotModal: React.FC<GraphPlotModalProps> = ({
  isOpen,
  onClose,
  onInsertGraph,
  theme,
}) => {
  const [formula, setFormula] = useState('x^2 - 3');
  const [color, setColor] = useState('#2563eb');

  const isDark = theme === 'chalkboard' || theme === 'blueprint';

  if (!isOpen) return null;

  const handlePlot = () => {
    if (!formula.trim()) return;
    onInsertGraph(formula.trim(), color);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden flex flex-col ${
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
            <LineChart className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm md:text-base">Построитель графиков функций</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Формула f(x):
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-500 font-bold">y =</span>
              <input
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="x^2 - 4, sin(x), 2*x + 1"
                className={`flex-1 px-3 py-2 text-sm font-mono rounded-xl border outline-none ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-white'
                    : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Популярные школьные шаблоны:
            </span>
            <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto">
              {PRESET_FUNCTIONS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setFormula(p.formula);
                    setColor(p.color);
                  }}
                  className={`text-left p-2 rounded-xl border text-xs font-medium transition ${
                    formula === p.formula
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="block truncate">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Цвет графика:
            </span>
            <div className="flex items-center gap-2">
              {['#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c', '#0284c7', '#ffffff'].map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      color === c
                        ? 'scale-125 ring-2 ring-blue-500'
                        : 'border-slate-300 dark:border-slate-600 hover:scale-110'
                    }`}
                  />
                )
              )}
            </div>
          </div>
        </div>

        <div
          className={`flex items-center justify-end gap-3 px-5 py-3 border-t ${
            isDark ? 'border-slate-800 bg-slate-800/30' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition"
          >
            Отмена
          </button>
          <button
            onClick={handlePlot}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Нарисовать на сетке</span>
          </button>
        </div>
      </div>
    </div>
  );
};
