import React from 'react';
import { SubjectMode } from '../types/board';
import { FunctionSquare, Compass, ArrowRight, BookOpen, Sparkles, Ruler, LineChart } from 'lucide-react';

interface HubEntranceProps {
  onSelectSubject: (subject: SubjectMode) => void;
  algebraPageCount: number;
  geometryPageCount: number;
}

export const HubEntrance: React.FC<HubEntranceProps> = ({
  onSelectSubject,
  algebraPageCount,
  geometryPageCount,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white overflow-y-auto">
      {/* Header */}
      <div className="text-center max-w-xl mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Интерактивная доска для репетиторов и учителей</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
          Выберите предмет для урока
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Каждое направление содержит специализированные инструменты, адаптированную панель и независимые страницы урока.
        </p>
      </div>

      {/* Subject Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl px-2">
        {/* 1. ALGEBRA CARD */}
        <div
          onClick={() => onSelectSubject('algebra')}
          className="group relative rounded-3xl p-6 sm:p-8 border border-blue-500/30 bg-slate-900/60 hover:bg-slate-900/90 backdrop-blur-xl hover:border-blue-400 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity">
            <LineChart className="w-36 h-36 text-blue-400" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <FunctionSquare className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300">
                {algebraPageCount} {algebraPageCount === 1 ? 'страница' : 'страниц'}
              </span>
            </div>

            <h2 className="text-2xl font-bold mb-2 text-white group-hover:text-blue-300 transition-colors">
              Алгебра
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              Рабочая среда для уравнений, функций, графиков и вычислений.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-300 mb-8">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Построитель графиков любых функций: <i>y = f(x)</i></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Декартовы оси координат X/Y со шкалой и стрелками</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Быстрая вставка формул, дробей, корней и степеней</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Школьная клетчатая сетка с полями</span>
              </li>
            </ul>
          </div>

          <button className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition">
            <span>Войти в Алгебру</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 2. GEOMETRY CARD */}
        <div
          onClick={() => onSelectSubject('geometry')}
          className="group relative rounded-3xl p-6 sm:p-8 border border-emerald-500/30 bg-slate-900/60 hover:bg-slate-900/90 backdrop-blur-xl hover:border-emerald-400 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/20 cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity">
            <Compass className="w-36 h-36 text-emerald-400" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                <Compass className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                {geometryPageCount} {geometryPageCount === 1 ? 'страница' : 'страниц'}
              </span>
            </div>

            <h2 className="text-2xl font-bold mb-2 text-white group-hover:text-emerald-300 transition-colors">
              Геометрия
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              Рабочая среда для чертежей, планиметрии, стереометрии и геометрических построений.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-300 mb-8">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span><b>Интерактивная линейка (см)</b> и <b>транспортир (180°)</b></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Фигуры: треугольники (произвольный, прямоугольный), прямоугольники</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Окружности с точкой в центре и радиусом</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Пунктирные линии для высот, медиан и невидимых граней</span>
              </li>
            </ul>
          </div>

          <button className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition">
            <span>Войти в Геометрию</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="mt-8 text-xs text-slate-500">
        Вы сможете мгновенно переключаться между Алгеброй и Геометрией в любой момент на верхней панели
      </div>
    </div>
  );
};
