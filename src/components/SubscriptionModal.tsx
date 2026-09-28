import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  CreditCard,
  Crown,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { User } from '../types/auth';
import { SubscriptionInfo } from '../types/payment';
import { cancelSubscription, createSubscriptionPayment, fetchMySubscription } from '../utils/payment';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onSuccessUpgrade?: (updatedUser: User) => void;
  onOpenTerms?: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccessUpgrade,
  onOpenTerms,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoadingSub, setIsLoadingSub] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setIsLoadingSub(true);
      fetchMySubscription()
        .then((sub) => setSubscription(sub))
        .catch(() => {})
        .finally(() => setIsLoadingSub(false));
    }
  }, [isOpen, currentUser]);

  if (!isOpen) {
    return null;
  }

  const handleCheckout = async () => {
    setIsLoading(true);
    setErrorNotice(null);
    setSuccessNotice('Переход к оплате через ЮKassa...');

    try {
      const data = await createSubscriptionPayment();
      if (data.confirmation_url) {
        setSuccessNotice('Перенаправляем на защищенный шлюз ЮKassa...');
        setTimeout(() => {
          window.location.href = data.confirmation_url;
        }, 300);
      } else {
        throw new Error('Платежная ссылка не получена');
      }
    } catch (err: any) {
      setErrorNotice(err.message || 'Ошибка создания платежа в ЮKassa');
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !window.confirm(
        'Вы уверены, что хотите отключить автопродление подписки? Доступ к PRO сохранится до конца оплаченного периода.'
      )
    ) {
      return;
    }

    setIsCanceling(true);
    setErrorNotice(null);
    try {
      await cancelSubscription();
      setSubscription((prev) => (prev ? { ...prev, status: 'canceled' } : null));
      setSuccessNotice('Автопродление успешно отключено. Списаний больше не будет.');
    } catch (err: any) {
      setErrorNotice(err.message || 'Не удалось отключить автосписание');
    } finally {
      setIsCanceling(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (date.getFullYear() >= 2090) return 'Бессрочно';
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
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

  const isPro = Boolean(currentUser?.is_pro);
  const isAutoRenewActive = subscription?.status === 'active';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !isLoading && !isCanceling) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-amber-400/40 bg-white p-6 shadow-2xl sm:p-8">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading || isCanceling}
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
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 animate-in fade-in">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-700" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* If user already has PRO */}
        {isPro ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/60 to-emerald-100/30 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700 text-white shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-emerald-950">
                    Статус PRO активен
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Реклама отключена, все инструменты доступны без ограничений
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-emerald-200/60 pt-3 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Действует до:</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatDate(currentUser?.pro_expires_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Автопродление (ЮKassa):</span>
                  </span>
                  {isLoadingSub ? (
                    <span className="text-slate-400">Проверка...</span>
                  ) : isAutoRenewActive ? (
                    <span className="font-bold text-emerald-700">Включено (99 ₽/мес)</span>
                  ) : (
                    <span className="font-medium text-slate-400">Отключено</span>
                  )}
                </div>

                {isAutoRenewActive && subscription?.next_billing_date && (
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500">Следующее списание:</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(subscription.next_billing_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Cancel subscription button */}
            {isAutoRenewActive && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={isCanceling}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                >
                  {isCanceling ? (
                    <>
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      <span>Отменяем автопродление...</span>
                    </>
                  ) : (
                    <span>Отменить автосписание</span>
                  )}
                </button>
                <p className="mt-1.5 text-center text-[11px] text-slate-400">
                  При отмене автосписания статус PRO сохранится до конца текущего оплаченного периода
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Benefits list */}
            <div className="mt-5 space-y-3">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                >
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
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Автоподписка ЮKassa
                  </span>
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
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/25 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Переход к оплате через ЮKassa...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-slate-950 text-slate-950" />
                    <span>Оформить подписку за 99 ₽/мес</span>
                  </>
                )}
              </button>

              {/* Legal Note required by YooKassa */}
              <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">
                Нажимая кнопку, вы соглашаетесь с условиями{' '}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenTerms) onOpenTerms();
                  }}
                  className="font-semibold text-slate-600 underline hover:text-emerald-800"
                >
                  Публичной оферты
                </button>{' '}
                и автоматическим продлением за 99 ₽/мес. Отменить подписку можно в любой момент в личном кабинете.
              </p>

              <div className="mt-2.5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <CreditCard className="h-3.5 w-3.5" />
                <span>Безопасная оплата через ЮKassa (карты МИР, СБП, Visa/MC)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
