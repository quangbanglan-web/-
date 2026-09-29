import React from 'react';
import { ShieldCheck, Mail, FileText, Lock, HelpCircle } from 'lucide-react';

interface FooterProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenContacts: () => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenTerms,
  onOpenPrivacy,
  onOpenContacts,
  className = '',
}) => {
  return (
    <footer className={`w-full border-t border-slate-200/80 bg-white/70 backdrop-blur-xs py-6 px-4 text-xs text-slate-500 ${className}`}>
      <div className="mx-auto max-w-7xl flex flex-col gap-5 sm:gap-6">
        {/* Top row: Brand & Legal links */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <span>ДОСКА</span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-800 font-black bg-emerald-100/80 px-1.5 py-0.2 rounded">
                Edu Platform
              </span>
            </p>
            <p className="text-slate-500 text-[11px]">
              © 2026 DOSKA. Сервис интерактивных онлайн-досок для преподавателей точных и гуманитарных дисциплин.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold">
            <button
              type="button"
              onClick={onOpenTerms}
              className="inline-flex items-center gap-1 text-slate-600 transition hover:text-emerald-800 hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Публичная оферта</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="inline-flex items-center gap-1 text-slate-600 transition hover:text-emerald-800 hover:underline"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Политика конфиденциальности</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={onOpenContacts}
              className="inline-flex items-center gap-1 text-slate-600 transition hover:text-emerald-800 hover:underline"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Контакты и реквизиты</span>
            </button>
          </div>
        </div>

        {/* Middle row: Self-employed requisites (compliance for YooKassa moderation) */}
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-[11px] text-slate-600 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-800">Самозанятый (НПД):</span>
            <span>Вайнбергер Иван Юрьевич</span>
            <span className="text-slate-300 hidden md:inline">|</span>
            <span className="font-semibold text-slate-800">ИНН:</span>
            <span className="font-mono">66520743874</span>
            <span className="text-slate-300 hidden md:inline">|</span>
            <span className="font-semibold text-slate-800">Email:</span>
            <a href="mailto:vainbergerivan0608@gmail.com" className="text-emerald-800 hover:underline font-medium">
              vainbergerivan0608@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold shrink-0 text-[10px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>Официальный плательщик НПД (422-ФЗ)</span>
          </div>
        </div>

        {/* Bottom row: Payment Systems Logos & YooKassa Guarantee */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-200/60 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Способы оплаты:
            </span>

            {/* МИР */}
            <div className="flex items-center justify-center rounded border border-slate-200 bg-white px-2 py-1 shadow-2xs" title="Платежная система МИР">
              <span className="font-black text-xs tracking-wider" style={{ color: '#007b53' }}>
                МИР
              </span>
            </div>

            {/* СБП */}
            <div className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 shadow-2xs" title="Система быстрых платежей (СБП)">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" fill="#005B9C" />
                <path d="M12 5l-5 3.5v7l5 3.5 5-3.5v-7L12 5z" fill="#FFCC00" />
                <path d="M12 8l-2.5 1.7v3.6l2.5 1.7 2.5-1.7V9.7L12 8z" fill="#E31E24" />
              </svg>
              <span className="font-black text-[11px] text-slate-800 tracking-tighter">СБП</span>
            </div>

            {/* Visa */}
            <div className="flex items-center justify-center rounded border border-slate-200 bg-white px-2 py-1 shadow-2xs" title="Visa">
              <span className="font-black text-xs italic tracking-tighter text-[#1434CB]">
                VISA
              </span>
            </div>

            {/* Mastercard */}
            <div className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 shadow-2xs" title="Mastercard">
              <div className="flex -space-x-1.5">
                <span className="h-3.5 w-3.5 rounded-full bg-[#EB001B] opacity-90 inline-block" />
                <span className="h-3.5 w-3.5 rounded-full bg-[#F79E1B] opacity-90 inline-block" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">Mastercard</span>
            </div>
          </div>

          {/* YooKassa Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold text-emerald-950 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span>Платежи защищены ЮKassa (PCI DSS Level 1)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
