import React, { useState, useMemo } from 'react';
import katex from 'katex';
import { X, Plus, Sparkles, Check } from 'lucide-react';
import { ThemeType } from '../types/board';

interface QuickMathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertLatex: (latex: string) => void;
  theme: ThemeType;
}

interface MathSymbol {
  label: string;
  latex: string;
  preview?: string;
  category: 'common' | 'algebra' | 'greek' | 'calculus' | 'matrices';
}

const SYMBOLS: MathSymbol[] = [
  // Common & Arithmetic
  { label: 'Дробь', latex: '\\frac{a}{b}', preview: '\\frac{1}{2}', category: 'common' },
  { label: 'Корень', latex: '\\sqrt{x}', preview: '\\sqrt{x}', category: 'common' },
  { label: 'Корень n-степени', latex: '\\sqrt[n]{x}', preview: '\\sqrt[3]{8}', category: 'common' },
  { label: 'Квадрат', latex: 'x^2', preview: 'x^2', category: 'common' },
  { label: 'Степень', latex: 'x^{n}', preview: 'x^n', category: 'common' },
  { label: 'Индекс', latex: 'x_{1}', preview: 'x_1', category: 'common' },
  { label: 'Умножение', latex: '\\cdot', preview: '\\cdot', category: 'common' },
  { label: 'Деление', latex: ':', preview: ':', category: 'common' },
  { label: 'Плюс-минус', latex: '\\pm', preview: '\\pm', category: 'common' },
  { label: 'Приблизительно', latex: '\\approx', preview: '\\approx', category: 'common' },
  { label: 'Не равно', latex: '\\neq', preview: '\\neq', category: 'common' },
  { label: 'Меньше или равно', latex: '\\le', preview: '\\le', category: 'common' },
  { label: 'Больше или равно', latex: '\\ge', preview: '\\ge', category: 'common' },
  { label: 'Бесконечность', latex: '\\infty', preview: '\\infty', category: 'common' },

  // Algebra & Equations
  { label: 'Квадратное уравнение', latex: 'ax^2 + bx + c = 0', preview: 'ax^2+bx+c=0', category: 'algebra' },
  { label: 'Формула корней', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', preview: 'x=\\frac{-b\\pm\\sqrt{D}}{2a}', category: 'algebra' },
  { label: 'Система уравнений', latex: '\\begin{cases} 2x + y = 10 \\\\ x - y = 2 \\end{cases}', preview: '\\begin{cases} x+y=1 \\\\ x-y=0 \\end{cases}', category: 'algebra' },
  { label: 'Теорема Пифагора', latex: 'a^2 + b^2 = c^2', preview: 'a^2+b^2=c^2', category: 'algebra' },
  { label: 'Логарифм', latex: '\\log_a(b)', preview: '\\log_a b', category: 'algebra' },
  { label: 'Натуральный логарифм', latex: '\\ln(x)', preview: '\\ln x', category: 'algebra' },
  { label: 'Синус', latex: '\\sin(x)', preview: '\\sin x', category: 'algebra' },
  { label: 'Косинус', latex: '\\cos(x)', preview: '\\cos x', category: 'algebra' },
  { label: 'Тангенс', latex: '\\tan(x)', preview: '\\tan x', category: 'algebra' },

  // Greek
  { label: 'Пи', latex: '\\pi', preview: '\\pi', category: 'greek' },
  { label: 'Альфа', latex: '\\alpha', preview: '\\alpha', category: 'greek' },
  { label: 'Бета', latex: '\\beta', preview: '\\beta', category: 'greek' },
  { label: 'Гамма', latex: '\\gamma', preview: '\\gamma', category: 'greek' },
  { label: 'Дельта', latex: '\\Delta', preview: '\\Delta', category: 'greek' },
  { label: 'Тета', latex: '\\theta', preview: '\\theta', category: 'greek' },
  { label: 'Лямбда', latex: '\\lambda', preview: '\\lambda', category: 'greek' },
  { label: 'Омега', latex: '\\Omega', preview: '\\Omega', category: 'greek' },

  // Calculus
  { label: 'Интеграл', latex: '\\int_{a}^{b} f(x) \\, dx', preview: '\\int_a^b f(x)dx', category: 'calculus' },
  { label: 'Сумма', latex: '\\sum_{i=1}^{n} a_i', preview: '\\sum_{i=1}^n', category: 'calculus' },
  { label: 'Предел', latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1', preview: '\\lim_{x\\to 0}', category: 'calculus' },
  { label: 'Производная', latex: "f'(x) = \\frac{df}{dx}", preview: "f'(x)", category: 'calculus' },

  // Matrices
  { label: 'Матрица 2x2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', preview: '\\begin{pmatrix} a&b\\\\c&d \\end{pmatrix}', category: 'matrices' },
  { label: 'Определитель 2x2', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', preview: '\\begin{vmatrix} a&b\\\\c&d \\end{vmatrix}', category: 'matrices' },
];

export const QuickMathModal: React.FC<QuickMathModalProps> = ({
  isOpen,
  onClose,
  onInsertLatex,
  theme,
}) => {
  const [activeCategory, setActiveCategory] = useState<'common' | 'algebra' | 'greek' | 'calculus' | 'matrices'>('common');
  const [customLatex, setCustomLatex] = useState('\\frac{a}{b}');

  const isDark = theme === 'chalkboard' || theme === 'blueprint';

  // Live KaTeX preview
  const previewHtml = useMemo(() => {
    try {
      return katex.renderToString(customLatex || '\\text{Пусто}', {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return `<span class="text-rose-500 font-mono">${customLatex}</span>`;
    }
  }, [customLatex]);

  if (!isOpen) return null;

  const handleAppendSymbol = (symbolLatex: string) => {
    if (!customLatex || customLatex === '\\frac{a}{b}') {
      setCustomLatex(symbolLatex);
    } else {
      setCustomLatex((prev) => `${prev} ${symbolLatex}`);
    }
  };

  const handleInsert = () => {
    if (customLatex.trim()) {
      onInsertLatex(customLatex.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh] ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-slate-950/70'
            : 'bg-white border-slate-200 text-slate-800 shadow-xl'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${
            isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              ∑
            </div>
            <h3 className="font-bold text-sm md:text-base">
              Конструктор математических формул и символов
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Display Card */}
        <div
          className={`p-5 flex flex-col items-center justify-center border-b min-h-[110px] ${
            isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/60 border-slate-100'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Предпросмотр на доске:
          </span>
          <div
            className="text-2xl md:text-3xl text-blue-600 dark:text-blue-400 py-1 overflow-x-auto max-w-full"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          {[
            { id: 'common', label: 'Базовые и дроби' },
            { id: 'algebra', label: 'Алгебра и формулы' },
            { id: 'greek', label: 'Греческие буквы' },
            { id: 'calculus', label: 'Анализ (∫, ∑, lim)' },
            { id: 'matrices', label: 'Матрицы и системы' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-xl transition whitespace-nowrap border-b-2 ${
                activeCategory === cat.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Symbols Grid */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 overflow-y-auto max-h-[220px]">
          {SYMBOLS.filter((s) => s.category === activeCategory).map((item, idx) => {
            let renderedThumb = item.preview || item.latex;
            try {
              renderedThumb = katex.renderToString(item.preview || item.latex, {
                throwOnError: false,
              });
            } catch {
              renderedThumb = item.label;
            }

            return (
              <button
                key={idx}
                onClick={() => handleAppendSymbol(item.latex)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition group active:scale-95 ${
                  isDark
                    ? 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-blue-500/50'
                    : 'border-slate-200/80 bg-white hover:bg-blue-50/50 hover:border-blue-400/60'
                }`}
              >
                <div
                  className="text-base text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition"
                  dangerouslySetInnerHTML={{ __html: renderedThumb }}
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom LaTeX Input Box */}
        <div className="px-4 pb-2 pt-1 flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Код LaTeX (можно редактировать или вставлять свой):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customLatex}
              onChange={(e) => setCustomLatex(e.target.value)}
              placeholder="e.g. \int_0^1 x^2 dx"
              className={`flex-1 px-3 py-2 text-sm font-mono rounded-xl border outline-none transition ${
                isDark
                  ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-slate-200'
                  : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-800'
              }`}
            />
            <button
              onClick={() => setCustomLatex('')}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Стереть
            </button>
          </div>
        </div>

        {/* Footer Actions */}
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
            onClick={handleInsert}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Поместить на доску</span>
          </button>
        </div>
      </div>
    </div>
  );
};
