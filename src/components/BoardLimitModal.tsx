import React from 'react';
import { AlertTriangle, Crown, Sparkles, Trash2, X } from 'lucide-react';

interface BoardLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingBoardTitle: string;
  onConfirmReplace: () => void;
  onOpenSubscription: () => void;
}

export const BoardLimitModal: React.FC<BoardLimitModalProps> = ({
  isOpen,
  onClose,
  existingBoardTitle,
  onConfirmReplace,
  onOpenSubscription,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-100 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Лимит бесплатного тарифа</h3>
              <p className="text-xs text-slate-500">Доступна 1 сохранённая доска</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            На бесплатном тарифе можно хранить только <strong>1 доску</strong>. Создание новой доски удалит текущую сохранённую доску:
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 truncate">
            «{existingBoardTitle || 'Текущая доска'}»
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Тариф PRO снимает лимит: создавайте неограниченное число досок!</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSubscription();
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 px-4 py-3 text-sm font-black text-slate-950 shadow-sm hover:brightness-105 transition active:scale-95"
          >
            <Crown className="w-4 h-4 fill-slate-950" />
            <span>Перейти на PRO — 99 ₽/мес</span>
          </button>

          <button
            type="button"
            onClick={onConfirmReplace}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 px-4 py-2.5 text-xs font-bold text-slate-700 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Заменить текущую доску</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-center py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
