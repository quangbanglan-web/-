import React, { useState } from 'react';
import { X, BookOpen, Lock, CheckCircle2, Sparkles, Crown } from 'lucide-react';
import { BoardBackground } from '../types/board';
import { User } from '../types/auth';

export interface SubjectTemplate {
  id: string;
  subject: string;
  label: string;
  description: string;
  background: BoardBackground;
  isPro: boolean;
  emoji: string;
}

const SUBJECT_TEMPLATES: SubjectTemplate[] = [
  {
    id: 'math',
    subject: 'math',
    label: 'Математика / Алгебра',
    description: 'Тетрадь в клетку',
    background: 'math_grid',
    isPro: false,
    emoji: '📐',
  },
  {
    id: 'russian',
    subject: 'russian',
    label: 'Русский язык / Литература',
    description: 'Тетрадь в линейку',
    background: 'ruled',
    isPro: true,
    emoji: '📖',
  },
  {
    id: 'physics',
    subject: 'physics',
    label: 'Физика',
    description: 'Миллиметровка',
    background: 'millimeter',
    isPro: true,
    emoji: '⚡',
  },
  {
    id: 'geography',
    subject: 'geography',
    label: 'География / История',
    description: 'Контурная карта',
    background: 'map_world',
    isPro: true,
    emoji: '🌍',
  },
  {
    id: 'universal',
    subject: 'general',
    label: 'Общая',
    description: 'Белый лист',
    background: 'clean',
    isPro: false,
    emoji: '📄',
  },
];

export interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard: (subjectId: string, background: BoardBackground, title?: string) => void;
  currentUser?: User | null;
  onOpenSubscription?: () => void;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  onCreateBoard,
  currentUser,
  onOpenSubscription,
}) => {
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<SubjectTemplate>(SUBJECT_TEMPLATES[0]);
  const [mapVariant, setMapVariant] = useState<'map_world' | 'map_russia'>('map_world');

  if (!isOpen) return null;

  const isPro = !!currentUser?.is_pro;

  const getEffectiveBackground = (): BoardBackground => {
    if (selected.id === 'geography') {
      return mapVariant;
    }
    return selected.background;
  };

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selected.isPro && !isPro) {
      onOpenSubscription?.();
      return;
    }
    const bg = getEffectiveBackground();
    onCreateBoard(selected.subject, bg, title.trim() || undefined);
    setTitle('');
    onClose();
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden bg-white border-slate-200 text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-board-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-800 text-white shadow-xs">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h3 id="create-board-modal-title" className="font-bold text-base text-slate-900">
                Новая доска
              </h3>
              <p className="text-xs text-slate-500">Выберите предмет и шаблон рабочей области</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="Закрыть окно"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 flex flex-col gap-5">
          {/* Board Title Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Название доски
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Геометрия 8 класс — Теорема Пифагора"
              maxLength={100}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none text-sm bg-slate-50 focus:bg-white transition"
            />
            <span className="text-[11px] text-slate-400">
              Если оставить пустым, название сформируется автоматически по предмету и дате.
            </span>
          </div>

          {/* Subject & Background Card Grid */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
              Предметный шаблон и фон:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SUBJECT_TEMPLATES.map((tmpl) => {
                const locked = tmpl.isPro && !isPro;
                const isSelected = selected.id === tmpl.id;
                return (
                  <button
                    type="button"
                    key={tmpl.id}
                    onClick={() => setSelected(tmpl)}
                    className={`relative flex items-center gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-700 ring-2 ring-emerald-700/20 bg-emerald-50/50 shadow-xs'
                        : locked
                        ? 'border-slate-200 bg-slate-50/60 hover:border-amber-300 hover:bg-amber-50/20'
                        : 'border-slate-200 hover:border-emerald-700/30 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{tmpl.emoji}</span>
                    <div className="min-w-0 flex-1 pr-6">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {tmpl.label}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {tmpl.description}
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="absolute top-2.5 right-2.5 w-4 h-4 text-emerald-700" />
                    )}
                    {tmpl.isPro && (
                      <span
                        className={`absolute top-2.5 right-2.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black ${
                          isPro
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-amber-500 text-slate-950 shadow-xs'
                        }`}
                      >
                        <Crown className="w-2.5 h-2.5" />
                        PRO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-choice for Map (World vs Russia) */}
          {selected.id === 'geography' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Тип контурной карты:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setMapVariant('map_world')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    mapVariant === 'map_world'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  🗺️ Карта мира
                </button>
                <button
                  type="button"
                  onClick={() => setMapVariant('map_russia')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    mapVariant === 'map_russia'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  🇷🇺 Карта РФ
                </button>
              </div>
            </div>
          )}

          {/* PRO Banner warning if locked template is chosen */}
          {selected.isPro && !isPro && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
              <div className="leading-relaxed">
                <span className="font-bold block">Шаблон доступен в тарифе PRO</span>
                <span>
                  Фоны «Линейка», «Миллиметровка» и «Контурные карты» входят в подписку PRO (99 ₽/мес). Вы можете подключить PRO или выбрать бесплатный шаблон («Алгебра / Геометрия» или «Универсальная»).
                </span>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Отмена
            </button>

            {selected.isPro && !isPro ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubscription?.();
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-xl shadow-xs hover:brightness-105 active:scale-95 transition cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                Подключить PRO — 99 ₽
              </button>
            ) : (
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                Создать доску →
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBoardModal;
