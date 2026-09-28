import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock, Sparkles, BookOpen, ExternalLink, Zap } from 'lucide-react';
import { logAdImpression } from '../../utils/ads';

interface InterstitialAdModalProps {
  isOpen: boolean;
  isPro?: boolean;
  boardTitle?: string;
  onProceed: () => void;
  onOpenSubscription: () => void;
}

export const InterstitialAdModal: React.FC<InterstitialAdModalProps> = ({
  isOpen,
  isPro = false,
  boardTitle = 'Урок',
  onProceed,
  onOpenSubscription,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const impressionSentRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (isPro) {
        onProceed();
        return;
      }
      setSecondsLeft(5);
      if (!impressionSentRef.current) {
        impressionSentRef.current = true;
        logAdImpression('interstitial_board_open');
      }

      const timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      impressionSentRef.current = false;
    }
  }, [isOpen, isPro, onProceed]);

  if (!isOpen || isPro) {
    return null;
  }

  const canSkip = secondsLeft === 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-emerald-900/20 bg-white p-6 shadow-2xl sm:p-8">
        {/* Header with timer badge */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-800 text-white">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Рекламная пауза</h2>
              <p className="text-xs text-slate-500">Загрузка доски: «{boardTitle}»</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {canSkip ? (
              <span className="text-emerald-700">Готово к переходу</span>
            ) : (
              <span>Осталось {secondsLeft} сек</span>
            )}
          </div>
        </div>

        {/* Ad Container / Creative placeholder */}
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-slate-50 to-amber-50/40 p-5 shadow-inner">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Партнер проекта
            </span>
            <span className="text-[11px] text-slate-400">РСЯ / Интерактивное образование</span>
          </div>

          <div className="my-4 flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-800 text-white shadow-md">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                Онлайн-школа для преподавателей
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Интерактивные презентации, банк проверочных заданий и олимпиадные материалы по всем предметам.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/70 pt-3 text-xs">
            <span className="font-semibold text-emerald-950">Для всех учителей РФ и СНГ</span>
            <a
              href="https://foxford.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
            >
              <span>Подробнее на сайте</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Button to proceed to lesson */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onProceed}
            disabled={!canSkip}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-md transition ${
              canSkip
                ? 'bg-emerald-800 text-white shadow-emerald-950/20 hover:bg-emerald-900 active:scale-[0.99]'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            <span>{canSkip ? 'Перейти к уроку' : `Пропустить через ${secondsLeft} сек...`}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Upsell PRO button */}
          <button
            type="button"
            onClick={() => {
              onOpenSubscription();
            }}
            className="group flex items-center justify-center gap-2 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-yellow-50 py-2.5 text-xs font-bold text-amber-900 shadow-sm transition hover:border-amber-400 hover:bg-amber-100/60 active:scale-[0.99]"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600 transition group-hover:scale-110" />
            <span>Убрать паузы навсегда за 99 ₽/мес</span>
            <Zap className="h-3 w-3 text-amber-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
