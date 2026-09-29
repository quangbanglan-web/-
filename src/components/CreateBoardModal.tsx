import React, { useState } from 'react';
import { X, BookOpen, Lock, CheckCircle2 } from 'lucide-react';
import { BoardBackground } from '../types/board';
import { User } from '../types/auth';

interface Subject {
  id: string;
  label: string;
  background: BoardBackground;
  isPro: boolean;
  emoji: string;
}

const SUBJECTS: Subject[] = [
  { id: 'standard', label: 'Стандартный', background: 'clean', isPro: false, emoji: '📄' },
  { id: 'algebra', label: 'Алгебра', background: 'grid', isPro: false, emoji: '🔢' },
  { id: 'math', label: 'Математика', background: 'grid', isPro: false, emoji: '📐' },
  { id: 'geometry', label: 'Геометрия', background: 'grid', isPro: false, emoji: '📏' },
  { id: 'physics', label: 'Физика', background: 'mm', isPro: false, emoji: '⚡' },
  { id: 'russian', label: 'Русский язык', background: 'ruled', isPro: true, emoji: '📝' },
  { id: 'literature', label: 'Литература', background: 'ruled', isPro: true, emoji: '📚' },
  { id: 'history', label: 'История', background: 'map-world', isPro: true, emoji: '🌍' },
  { id: 'geography', label: 'География', background: 'map-russia', isPro: true, emoji: '🗺️' },
];

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard: (subjectId: string, background: BoardBackground) => void;
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
  const [selected, setSelected] = useState<Subject>(SUBJECTS[0]);

  if (!isOpen) return null;

  const isPro = !!currentUser?.is_pro;

  const handleCreate = () => {
    if (selected.isPro && !isPro) {
      onOpenSubscription?.();
      return;
    }
    onCreateBoard(selected.id, selected.background);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden bg-white border-slate-200 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base">Новая доска</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Выберите предмет и фон:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SUBJECTS.map((subj) => {
                const locked = subj.isPro && !isPro;
                const isSelected = selected.id === subj.id;
                return (
                  <button
                    key={subj.id}
                    onClick={() => setSelected(subj)}
                    className={`relative flex items-center gap-2.5 p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40'
                        : locked
                        ? 'border-slate-200 opacity-70 hover:border-amber-300 hover:bg-amber-50/30'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/20'
                    }`}
                  >
                    <span className="text-xl">{subj.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{subj.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">
                        {subj.background === 'clean' ? 'Чистый лист'
                          : subj.background === 'grid' ? 'В клетку'
                          : subj.background === 'ruled' ? 'В линейку'
                          : subj.background === 'mm' ? 'Миллиметровка'
                          : subj.background === 'map-world' ? 'Карта мира'
                          : 'Карта РФ'}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="absolute top-1.5 right-1.5 w-4 h-4 text-blue-500" />
                    )}
                    {locked && (
                      <Lock className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PRO notice if selected is PRO */}
          {selected.isPro && !isPro && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <div>
                <span className="font-bold block">Доступно в PRO</span>
                <span>Этот шаблон доступен в подписке PRO за 99 ₽/мес. После оплаты вы получите доступ ко всем предметным фонам.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-black/5 rounded-xl transition"
          >
            Отмена
          </button>
          {selected.isPro && !isPro ? (
            <button
              onClick={() => { onOpenSubscription?.(); onClose(); }}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md transition"
            >
              <Lock className="w-3.5 h-3.5" />
              Подключить PRO
            </button>
          ) : (
            <button
              onClick={handleCreate}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/25 transition"
            >
              Создать доску →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
