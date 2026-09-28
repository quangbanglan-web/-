import React, { useState } from 'react';
import {
  Check,
  Crown,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { requestUpgradeToPro } from '../utils/ads';
import { User } from '../types/auth';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onSuccessUpgrade?: (updatedUser: User) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccessUpgrade,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleCheckout = async () => {
    setIsLoading(true);
    setErrorNotice(null);
    setSuccessNotice('Переход к платежному шлюзу ЮMoney... Активация PRO-доступа...');

    try {
      // Имитация шлюза с реальным серверным переключением is_pro = 1 в БД
      const result = await requestUpgradeToPro();
      setSuccessNotice('Подписка DOSKA PRO успешно активирована! Приятных уроков!');
      setTimeout(() => {
        if (result?.user) {
          onSuccessUpgrade?.(result.user);
        }
        setIsLoading(false);
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorNotice(err.message || 'Ошибка активации подписки');
      setIsLoading(false);
    }
  };

  const benefits = [
    {
      title: '0% рекламы',
      description: 'Никаких баннеров внизу экрана и отвлекающих элементов на уроке.',
    },
    {
      title: 'Мгновенное открытие уроков без пауз',
      description: 'Запуск любой доски за долю секунды без 5-секундных ожиданий.',
    },
    {
      title: 'Доступ ко всем предметам и инструментам',
      description: 'Неограниченное число листов, формул и графиков функций.',
    },
    {
      title: 'Поддержка разработки проекта',
      description: 'Вклад в развитие удобного инструмента для российских педагогов.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-amber-400/40 bg-white p-6 shadow-2xl sm:p-8">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          title="Закрыть"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Top badge & header */}
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/30">
            <Crown className="h-6 w-6 fill-slate-950" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">
            <Sparkles className="h-3 w-3 text-amber-600" />
            <span>Премиум-тариф</span>
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            DOSKA PRO — уроки без ограничений
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Все возможности для комфортной и продуктивной работы учителя
          </p>
        </div>

        {/* Success/Info notices */}
        {successNotice && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 animate-in fade-in">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>{successNotice}</span>
          </div>
        )}

        {errorNotice && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 animate-in fade-in">
            {errorNotice}
          </div>
        )}

        {/* Benefits list */}
        <div className="mt-5 space-y-3">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-800 text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900 sm:text-sm">{benefit.title}</p>
                <p className="text-[11px] text-slate-500 sm:text-xs">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Card */}
        <div className="mt-6 rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50/60 via-yellow-50/30 to-amber-100/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Ежемесячный план</span>
              <p className="text-2xl font-black text-slate-900 sm:text-3xl">
                99 ₽ <span className="text-xs font-semibold text-slate-500">/ месяц</span>
              </p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                Всего ~3 ₽ в день
              </span>
              <p className="mt-1 text-[10px] text-slate-500">Отмена в 1 клик</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={isLoading || currentUser?.is_pro}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/25 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin text-slate-950" />
                <span>Обработка запроса...</span>
              </>
            ) : currentUser?.is_pro ? (
              <>
                <ShieldCheck className="h-4 w-4 text-slate-950" />
                <span>У вас уже активен PRO статус</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-slate-950 text-slate-950" />
                <span>Оформить за 99 ₽</span>
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Безопасная оплата картами РФ, СБП, ЮMoney и SberPay
          </p>
        </div>
      </div>
    </div>
  );
};
