import React, { useState, useMemo } from 'react';
import katex from 'katex';
import { MathElement, ThemeType } from '../types/board';
import { solveMathExpression } from '../utils/mathRecognition';
import {
  GripHorizontal,
  X,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Edit2,
  Type,
  PenTool,
  Code
} from 'lucide-react';

interface MathCardProps {
  element: MathElement;
  zoom: number;
  pan: { x: number; y: number };
  theme: ThemeType;
  onUpdate: (updated: MathElement) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.PointerEvent, id: string) => void;
}

export const MathCard: React.FC<MathCardProps> = ({
  element,
  zoom,
  pan,
  theme,
  onUpdate,
  onDelete,
  onDragStart,
}) => {
  const [isSolving, setIsSolving] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(element.cleanText || element.text || element.latex);

  const handleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startFontSize = element.fontSize || 32;

    const handlePointerMove = (moveEv: PointerEvent) => {
      const delta = (moveEv.clientX - startX) + (moveEv.clientY - startY);
      const newFontSize = Math.min(84, Math.max(16, Math.round(startFontSize + delta / (4 * Math.max(0.2, zoom)))));
      onUpdate({ ...element, fontSize: newFontSize });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Screen coordinates
  const screenX = (element.x + pan.x) * zoom;
  const screenY = (element.y + pan.y) * zoom;

  // Active font style: 'handwriting' (Caveat cursive), 'school' (Neucha), 'calligraphy' (Marck Script), or 'latex' (KaTeX)
  const fontStyle = element.fontStyle || 'handwriting';

  // Render KaTeX HTML if in LaTeX mode or math syntax present
  const katexHtml = useMemo(() => {
    if (!element.latex) return null;
    try {
      return katex.renderToString(element.latex, {
        throwOnError: false,
        displayMode: true,
      });
    } catch (e) {
      return null;
    }
  }, [element.latex]);

  const handleCopy = () => {
    navigator.clipboard.writeText(element.cleanText || element.latex || element.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSolve = async () => {
    if (element.steps && element.steps.length > 0) {
      setShowSteps(!showSteps);
      return;
    }

    setIsSolving(true);
    try {
      const expr = element.latex || element.cleanText || element.text || '';
      const res = await solveMathExpression(expr);
      onUpdate({
        ...element,
        isSolved: true,
        steps: res.steps,
        finalAnswer: res.finalAnswer,
      });
      setShowSteps(true);
    } catch (err) {
      console.error('Error solving:', err);
    } finally {
      setIsSolving(false);
    }
  };

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    onUpdate({
      ...element,
      cleanText: trimmed,
      latex: trimmed,
      text: trimmed,
    });
    setIsEditing(false);
  };

  const cycleFontStyle = () => {
    const styles: Array<'handwriting' | 'school' | 'calligraphy' | 'latex'> = [
      'handwriting',
      'school',
      'calligraphy',
      'latex',
    ];
    const nextIdx = (styles.indexOf(fontStyle) + 1) % styles.length;
    onUpdate({
      ...element,
      fontStyle: styles[nextIdx],
    });
  };

  const isDark = theme === 'chalkboard' || theme === 'blueprint';

  // Font class for handwriting
  const fontClass = {
    handwriting: 'font-handwriting',
    school: 'font-school',
    calligraphy: 'font-calligraphy',
    latex: 'font-math',
  }[fontStyle];

  const fontLabel = {
    handwriting: 'Каллиграфия',
    school: 'Тетрадь',
    calligraphy: 'Перо',
    latex: 'LaTeX',
  }[fontStyle];

  return (
    <div
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
      }}
      className={`absolute group select-none transition-shadow rounded-2xl border backdrop-blur-md shadow-lg pointer-events-auto z-20 ${
        isDark
          ? 'bg-slate-900/90 border-slate-700/80 text-slate-100 shadow-slate-950/40'
          : 'bg-white/95 border-amber-200/90 text-slate-900 shadow-amber-950/10'
      }`}
    >
      {/* Top Header / Drag Handle */}
      <div
        onPointerDown={(e) => onDragStart(e, element.id)}
        className={`flex items-center justify-between px-3 py-1.5 cursor-grab active:cursor-grabbing border-b text-xs ${
          isDark
            ? 'border-slate-800 bg-slate-800/60 text-slate-400'
            : 'border-amber-100 bg-amber-50/70 text-slate-600'
        } rounded-t-2xl`}
      >
        <div className="flex items-center gap-1.5 font-medium">
          <GripHorizontal className="w-3.5 h-3.5 opacity-60" />
          <button
            onClick={cycleFontStyle}
            title="Переключить стиль шрифта (рукописный, школьный, перо, LaTeX)"
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[11px] hover:bg-blue-500/20 transition"
          >
            <PenTool className="w-3 h-3" />
            <span>{fontLabel}</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Font scale buttons */}
          <button
            onClick={() => onUpdate({ ...element, fontSize: Math.max(16, element.fontSize - 4) })}
            title="Уменьшить"
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={() => onUpdate({ ...element, fontSize: Math.min(64, element.fontSize + 4) })}
            title="Увеличить"
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            title="Редактировать текст"
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleCopy}
            title="Скопировать"
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
          <button
            onClick={() => onDelete(element.id)}
            title="Удалить"
            className="p-1 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 flex flex-col items-center justify-center min-w-[150px] max-w-[550px]">
        {isEditing ? (
          <div className="w-full flex flex-col gap-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2.5 text-base border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm"
              >
                Сохранить
              </button>
            </div>
          </div>
        ) : fontStyle === 'latex' && katexHtml ? (
          <div
            style={{ fontSize: `${element.fontSize}px`, color: element.color }}
            className="katex-container overflow-x-auto py-1 px-2 select-text"
            dangerouslySetInnerHTML={{ __html: katexHtml }}
          />
        ) : (
          <div
            style={{
              fontSize: `${element.fontSize}px`,
              color: element.color,
              lineHeight: 1.25,
            }}
            className={`${fontClass} font-semibold py-1 px-3 select-text tracking-wide whitespace-pre-wrap text-center`}
          >
            {element.cleanText || element.text || element.latex}
          </div>
        )}

        {/* Quick solved result pill if available */}
        {element.result && (
          <div className="mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50 flex items-center gap-1">
            <span>= {element.result}</span>
          </div>
        )}
      </div>

      {/* Step-by-step Solution Accordion */}
      {showSteps && element.steps && (
        <div
          className={`px-4 py-3 border-t text-xs max-w-[420px] ${
            isDark ? 'border-slate-800 bg-slate-950/50' : 'border-amber-100/70 bg-amber-50/40'
          }`}
        >
          <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Решение по шагам:</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 dark:text-slate-300 select-text font-sans">
            {element.steps.map((step, idx) => (
              <li key={idx} className="leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
          {element.finalAnswer && (
            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 font-semibold text-emerald-600 dark:text-emerald-400 select-text">
              {element.finalAnswer}
            </div>
          )}
        </div>
      )}

      {/* Footer Actions (Solve / Explain) */}
      <div
        className={`px-3 py-1.5 flex items-center justify-between text-xs border-t ${
          isDark ? 'border-slate-800/80 bg-slate-800/30' : 'border-amber-100 bg-amber-50/30'
        } rounded-b-2xl`}
      >
        <button
          onClick={handleSolve}
          disabled={isSolving}
          className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isSolving ? 'animate-spin' : ''}`} />
          <span>
            {isSolving
              ? 'Решаю...'
              : element.steps
              ? showSteps
                ? 'Скрыть'
                : 'Показать решение'
              : 'Решить'}
          </span>
          {element.steps && (
            showSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          )}
        </button>

        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono pr-2">
          Клик для стиля
        </span>
      </div>

      {/* Interactive Drag-to-Resize Handle */}
      <div
        onPointerDown={handleResizeStart}
        title="Потяните для изменения размера формулы"
        className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-40 hover:opacity-100 transition text-slate-400 hover:text-blue-600"
      >
        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-current">
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="4" cy="8" r="1.2" />
          <circle cx="8" cy="4" r="1.2" />
        </svg>
      </div>
    </div>
  );
};
