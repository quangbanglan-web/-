import React, { useState, useRef } from 'react';
import { ToolType, ThemeType, SubjectMode, ToolbarCustomization } from '../types/board';
import {
  Pen,
  Highlighter,
  Eraser,
  Minus,
  MoveRight,
  Square,
  Circle,
  TrendingUp,
  Triangle,
  Ruler,
  Compass,
  LineChart,
  Calculator,
  Navigation,
  Hand,
  Undo2,
  Redo2,
  Settings,
  GripVertical,
  SlidersHorizontal,
  Grid,
} from 'lucide-react';

interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  color: string;
  onSelectColor: (c: string) => void;
  width: number;
  onSelectWidth: (w: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  theme: ThemeType;
  subjectMode: SubjectMode;
  toolbarCustomization: ToolbarCustomization;
  palmRejection: boolean;
  onTogglePalmRejection: () => void;
  // Geometry interactive instruments
  showRuler: boolean;
  onToggleRuler: () => void;
  showProtractor: boolean;
  onToggleProtractor: () => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  // Modals
  onOpenQuickMath: () => void;
  onOpenGraphPlotter: () => void;
  onOpenSettings: () => void;
  onOpenToolbarCustomizer: () => void;
  // Free Floating Position
  position: { x: number; y: number };
  onChangePosition: (pos: { x: number; y: number }) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  color,
  onSelectColor,
  width,
  onSelectWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  theme,
  subjectMode,
  toolbarCustomization,
  palmRejection,
  onTogglePalmRejection,
  showRuler,
  onToggleRuler,
  showProtractor,
  onToggleProtractor,
  snapToGrid,
  onToggleSnapToGrid,
  onOpenQuickMath,
  onOpenGraphPlotter,
  onOpenSettings,
  onOpenToolbarCustomizer,
  position,
  onChangePosition,
}) => {
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);

  const isDark = theme === 'chalkboard' || theme === 'blueprint';
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 });

  // Palette suited for teacher whiteboard
  const colors = isDark
    ? ['#ffffff', '#38bdf8', '#4ade80', '#f87171', '#facc15', '#c084fc', '#fb923c']
    : ['#1e3a8a', '#0f172a', '#dc2626', '#15803d', '#7c3aed', '#ea580c', '#ca8a04'];

  const widths = [2, 4, 7, 14];

  // Available geometric shapes
  const shapes: Array<{ tool: ToolType; label: string; icon: React.ReactNode }> = [
    { tool: 'line', label: 'Прямая', icon: <Minus className="w-4 h-4" /> },
    { tool: 'dashed-line', label: 'Пунктир (высота / грань)', icon: <span className="font-mono font-black text-xs">---</span> },
    { tool: 'arrow', label: 'Вектор / Стрелка', icon: <MoveRight className="w-4 h-4" /> },
    { tool: 'triangle', label: 'Треугольник', icon: <Triangle className="w-4 h-4" /> },
    { tool: 'right-triangle', label: 'Прямоугольный треугольник', icon: <span className="font-bold text-xs">⊿</span> },
    { tool: 'rect', label: 'Прямоугольник', icon: <Square className="w-4 h-4" /> },
    { tool: 'circle', label: 'Окружность с центром', icon: <Circle className="w-4 h-4" /> },
  ];

  const activeShape = shapes.find((s) => s.tool === currentTool);
  const isShapeActive = !!activeShape;

  // Free Dragging handler
  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (isDraggingRef.current) {
        const dx = ev.clientX - dragStartRef.current.mouseX;
        const dy = ev.clientY - dragStartRef.current.mouseY;
        const newX = Math.max(10, Math.min(window.innerWidth - 220, dragStartRef.current.initialX + dx));
        const newY = Math.max(10, Math.min(window.innerHeight - 80, dragStartRef.current.initialY + dy));
        onChangePosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <aside
      aria-label="Панель инструментов"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`fixed z-30 flex items-center gap-1.5 p-1.5 rounded-2xl shadow-2xl backdrop-blur-xl border select-none transition-shadow ${
        isDark
          ? 'bg-slate-900/95 border-slate-700/80 shadow-slate-950/60 text-slate-100'
          : 'bg-white/95 border-slate-200/90 shadow-slate-900/15 text-slate-800'
      }`}
    >
      {/* 0. Free Drag Handle */}
      <div
        onPointerDown={handlePointerDownDrag}
        title="Зажмите и потяните, чтобы переместить панель в любое удобное место экрана"
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-grab active:cursor-grabbing transition"
      >
        <GripVertical className="w-4 h-5" />
      </div>

      {/* 1. Main Drawing Tools */}
      <div className="flex items-center gap-1">
        {toolbarCustomization.pen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectTool('pen');
            }}
            title="Ручка (Перо)"
            className={`p-2.5 rounded-xl transition flex items-center justify-center relative ${
              currentTool === 'pen'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400/40'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Pen className="w-5 h-5" />
            {currentTool === 'pen' && (
              <span
                style={{ backgroundColor: color }}
                className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full border border-white dark:border-black"
              />
            )}
          </button>
        )}

        {toolbarCustomization.highlighter && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectTool('highlighter');
            }}
            title="Текстовыделитель / Маркер"
            className={`p-2.5 rounded-xl transition flex items-center justify-center ${
              currentTool === 'highlighter'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Highlighter className="w-5 h-5" />
          </button>
        )}

        {toolbarCustomization.eraser && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectTool('eraser');
            }}
            title="Ластик"
            className={`p-2.5 rounded-xl transition flex items-center justify-center ${
              currentTool === 'eraser'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Eraser className="w-5 h-5" />
          </button>
        )}

        {/* Shapes Menu Dropdown */}
        {toolbarCustomization.shapes && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowShapesMenu(!showShapesMenu);
                setShowColorMenu(false);
              }}
              title="Геометрические фигуры (прямая, пунктир, треугольники, окружность)"
              className={`p-2.5 rounded-xl transition flex items-center justify-center ${
                isShapeActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/40'
                  : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isShapeActive && activeShape ? (
                <span className="w-5 h-5 flex items-center justify-center">{activeShape.icon}</span>
              ) : (
                <Compass className="w-5 h-5" />
              )}
            </button>

            {showShapesMenu && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className={`absolute z-40 p-1.5 rounded-2xl shadow-2xl border backdrop-blur-lg flex flex-col gap-1 min-w-[220px] bottom-full mb-2 left-0 ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Фигуры и чертежи:
                </div>
                {shapes.map((s) => (
                  <button
                    key={s.tool}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTool(s.tool);
                      setShowShapesMenu(false);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                      currentTool === s.tool
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="w-4 h-4 flex items-center justify-center">{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Axes */}
        {toolbarCustomization.axes && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectTool('axes');
            }}
            title="Оси координат X/Y"
            className={`p-2.5 rounded-xl transition flex items-center justify-center ${
              currentTool === 'axes'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </button>
        )}

        {/* Geometry specific interactive instruments: Ruler, Protractor, Snap */}
        {subjectMode === 'geometry' && toolbarCustomization.ruler && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleRuler();
            }}
            title={showRuler ? 'Линейка ВКЛЮЧЕНА (нажмите, чтобы скрыть)' : 'Показать виртуальную линейку 20 см'}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              showRuler
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400/50'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-amber-500/20'
            }`}
          >
            <Ruler className="w-4 h-4" />
            <span className="text-[11px] font-bold">{showRuler ? 'Линейка: ВКЛ' : 'Линейка'}</span>
          </button>
        )}

        {subjectMode === 'geometry' && toolbarCustomization.protractor && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleProtractor();
            }}
            title={showProtractor ? 'Транспортир ВКЛЮЧЕН (нажмите, чтобы скрыть)' : 'Показать транспортир 180°'}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              showProtractor
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400/50'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-cyan-500/20'
            }`}
          >
            <span className="text-[11px] font-bold">{showProtractor ? '180°: ВКЛ' : '180°'}</span>
          </button>
        )}

        {/* Snap to Grid button inside Toolbar for Geometry */}
        {subjectMode === 'geometry' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSnapToGrid();
            }}
            title={snapToGrid ? 'Привязка к сетке ВКЛЮЧЕНА (нажмите, чтобы выключить)' : 'Привязка к сетке ВЫКЛЮЧЕНА'}
            className={`p-2 rounded-xl transition flex items-center justify-center ${
              snapToGrid
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-400'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
        )}

        {/* Laser Pointer */}
        {toolbarCustomization.laser && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectTool('laser');
            }}
            title="Лазерная указка"
            className={`p-2.5 rounded-xl transition flex items-center justify-center ${
              currentTool === 'laser'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/40 animate-pulse'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Navigation className="w-5 h-5 -rotate-45" />
          </button>
        )}

        {/* Pan Hand Tool */}
        {toolbarCustomization.pan && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectTool('pan');
            }}
            title="Рука (Перемещение по доске)"
            className={`p-2.5 rounded-xl transition flex items-center justify-center ${
              currentTool === 'pan'
                ? 'bg-slate-700 text-white'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Hand className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Algebra Specific Modals */}
      {(toolbarCustomization.quickMath || toolbarCustomization.graphPlotter) && (
        <>
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
          <div className="flex items-center gap-1">
            {toolbarCustomization.quickMath && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenQuickMath();
                }}
                title="Вставка формул и спецсимволов"
                className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition flex items-center justify-center"
              >
                <Calculator className="w-5 h-5" />
              </button>
            )}

            {toolbarCustomization.graphPlotter && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenGraphPlotter();
                }}
                title="Построить график функции (y = f(x))"
                className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition flex items-center justify-center"
              >
                <LineChart className="w-5 h-5" />
              </button>
            )}
          </div>
        </>
      )}

      <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

      {/* 3. Color & Stroke Width Pickers */}
      <div className="flex items-center gap-1">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowColorMenu(!showColorMenu);
              setShowShapesMenu(false);
            }}
            title="Выбор цвета и толщины"
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition flex items-center gap-1.5"
          >
            <div
              style={{ backgroundColor: color }}
              className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 shadow-sm"
            />
          </button>

          {showColorMenu && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className={`absolute z-40 p-3 rounded-2xl shadow-2xl border backdrop-blur-xl flex flex-col gap-3 min-w-[200px] bottom-full mb-2 left-0 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Цвет пера
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectColor(c);
                        setShowColorMenu(false);
                      }}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border transition-transform ${
                        color === c
                          ? 'scale-125 ring-2 ring-blue-500 shadow-sm'
                          : 'hover:scale-110 border-slate-300 dark:border-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Толщина штриха
                </span>
                <div className="flex items-center gap-2">
                  {widths.map((w) => (
                    <button
                      key={w}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWidth(w);
                      }}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center border transition ${
                        width === w
                          ? 'border-blue-500 bg-blue-500/10 font-bold'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div
                        style={{ height: `${w}px`, width: '100%' }}
                        className="bg-current rounded-full mx-1 max-w-[24px]"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

      {/* 4. Undo / Redo & Settings */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUndo();
          }}
          disabled={!canUndo}
          title="Отменить (Ctrl+Z)"
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRedo();
          }}
          disabled={!canRedo}
          title="Повторить (Ctrl+Y)"
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Toolbar Customizer Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenToolbarCustomizer();
          }}
          title="Настройка кнопок на панели"
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-blue-500 transition"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Board Settings button (Theme, Grid, Smoothing) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings();
          }}
          title="Настройки доски (тема, сетка, сглаживание)"
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
