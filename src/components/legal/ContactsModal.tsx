import React, { useEffect } from 'react';
import { Mail, Phone, MapPin, Building, ShieldCheck, X, Check, HelpCircle } from 'lucide-react';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-md animate-in fade-in duration-200 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <HelpCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                Контакты и реквизиты
              </h2>
              <p className="text-xs text-slate-500">
                Информация об операторе сервиса DOSKA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть (Esc)"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 px-6 py-5 text-xs text-slate-700">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Building className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Исполнитель:</span>
                <p className="font-bold text-slate-900 text-sm">Самозанятый Вайнбергер Иван Юрьевич</p>
                <p className="text-[11px] text-slate-500">Специальный налоговый режим НПД (ФЗ № 422-ФЗ)</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500">ИНН:</span>
              <span className="font-mono text-sm font-bold text-slate-900">66520743874</span>
            </div>

            <div className="flex items-start gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Служба заботы и поддержки:</span>
                <p className="font-bold text-emerald-800">
                  <a href="mailto:vainbergerivan0608@gmail.com" className="hover:underline">
                    vainbergerivan0608@gmail.com
                  </a>
                </p>
                <p className="text-[11px] text-slate-500">Время ответа: до 24 часов (ежедневно)</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Регион деятельности:</span>
                <p className="font-semibold text-slate-900">Российская Федерация</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-start gap-3 text-emerald-950">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700 mt-0.5" />
            <div className="text-[11px]">
              <p className="font-bold">Безопасность платежей</p>
              <p className="mt-0.5">
                Все расчеты производятся через сертифицированный шлюз ООО НКО «ЮМани» (ЮKassa).
                Сервис DOSKA не имеет доступа к данным банковских карт.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-95"
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
            <span>Понятно</span>
          </button>
        </div>
      </div>
    </div>
  );
};
