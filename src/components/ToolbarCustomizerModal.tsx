import React from 'react';
import { X, SlidersHorizontal, Check, RefreshCw } from 'lucide-react';
import { ToolbarCustomization, ThemeType } from '../types/board';

interface ToolbarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customization: ToolbarCustomization;
  onChangeCustomization: (updater: (prev: ToolbarCustomization) => ToolbarCustomization) => void;
  onResetDefault: () => void;
  theme: ThemeType;
}

export const ToolbarCustomizerModal: React.FC<ToolbarCustomizerModalProps> = ({
  isOpen,
  onClose,
  customization,
  onChangeCustomization,
  onResetDefault,
  theme,
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'chalkboard' || theme === 'blueprint';

  const toolItems: Array<{
    id: keyof ToolbarCustomization;
    title: string;
    desc: string;
  }> = [
    { id: 'pen', title: 'Ручка (Перо)', desc: 'Основной инструмент для письма' },
    { id: 'highlighter', title: 'Текстовыделитель / Маркер', desc: 'Полупрозрачный маркер для акцентов' },
    { id: 'eraser', title: 'Ластик', desc: 'Удаление линий при касании' },
    { id: 'shapes', title: 'Геометрические фигуры', desc: 'Прямые, пунктир, треугольники, окружности' },
    { id: 'axes', title: 'Оси координат X/Y', desc: 'Координатная плоскость со шкалой' },
    { id: 'ruler', title: 'Интерактивная линейка', desc: 'Шкала в сантиметрах и миллиметрах' },
    { id: 'protractor', title: 'Интерактивный транспортир', desc: 'Измерение углов 0° - 180°' },
    { id: 'graphPlotter', title: 'Построитель графиков', desc: 'Графики функций y = f(x)' },
    { id: 'quickMath', title: 'Быстрые формулы', desc: 'Дроби, степени, корни и спецсимволы' },
    { id: 'laser', title: 'Лазерная указка', desc: 'Исчезающий след для показа ученику' },
    { id: 'pan', title: 'Рука (Перемещение)', desc: 'Инструмент для сдвига холста' },
  ];

  const toggleTool = (id: keyof ToolbarCustomization) => {
    onChangeCustomization((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh] ${
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
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base">Настройка состава панели инструментов</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3 overflow-y-auto">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Включайте только те кнопки, которые нужны для текущего урока. Лишние инструменты скроются, делая панель компактной.
          </p>

          <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
            {toolItems.map((item) => {
              const active = customization[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => toggleTool(item.id)}
                  className="flex items-center justify-between pt-2 pb-1.5 px-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition"
                >
                  <div className="pr-3">
                    <span className="text-xs font-bold block">{item.title}</span>
                    <span className="text-[11px] text-slate-400 block">{item.desc}</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                      active
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-700 bg-transparent'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className={`px-5 py-3 border-t flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-800/30' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <button
            onClick={onResetDefault}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Сбросить по умолчанию</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};
