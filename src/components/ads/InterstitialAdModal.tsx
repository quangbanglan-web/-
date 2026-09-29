import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, Clock, Sparkles, BookOpen, ExternalLink, Zap, X } from 'lucide-react';
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
  const hasProceededRef = useRef(false);
  const onProceedRef = useRef(onProceed);
  onProceedRef.current = onProceed;

  const safeProceed = useCallback(() => {
    if (hasProceededRef.current) return;
    hasProceededRef.current = true;
    console.log('[InterstitialAdModal] Proceeding to open board:', boardTitle);
    onProceedRef.current();
  }, [boardTitle]);

  useEffect(() => {
    if (isOpen) {
      hasProceededRef.current = false;
      setSecondsLeft(5);

      if (isPro) {
        console.log('[InterstitialAdModal] User is PRO, bypassing interstitial ad immediately');
        safeProceed();
        return;
      }

      console.log('[InterstitialAdModal] Opened interstitial ad for board:', boardTitle);

      if (!impressionSentRef.current) {
        impressionSentRef.current = true;
        logAdImpression('interstitial_board_open').catch((err) => {
          console.warn('[InterstitialAdModal] Impression log failed (non-blocking):', err);
        });
      }

      // Interval countdown
      const timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            console.log('[InterstitialAdModal] Timer expired (0s). Auto-opening board...');
            setTimeout(() => {
              safeProceed();
            }, 50);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Safety fallback timer: guarantee that within 5.5s maximum the board ALWAYS opens
      const safetyFallback = setTimeout(() => {
        console.log('[InterstitialAdModal] Safety fallback timeout fired (5.5s). Guaranteeing board opens.');
        safeProceed();
      }, 5500);

      return () => {
        clearInterval(timer);
        clearTimeout(safetyFallback);
      };
    } else {
      impressionSentRef.current = false;
    }
  }, [isOpen, isPro, boardTitle, safeProceed]);

  // Support closing/proceeding via Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('[InterstitialAdModal] Esc key pressed, proceeding to board');
        safeProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, safeProceed]);

  if (!isOpen || isPro) {
    return null;
  }

  const canSkip = secondsLeft === 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          console.log('[InterstitialAdModal] Backdrop clicked, proceeding to board');
          safeProceed();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative my-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-emerald-900/20 bg-white shadow-2xl overflow-hidden"
      >
        {/* Header with timer badge & skip button */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-4 sm:px-6">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-800 text-white">
              <Clock className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">Рекламная пауза</h2>
              <p className="truncate text-xs text-slate-500">Загрузка: «{boardTitle}»</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {canSkip ? (
                <span className="text-emerald-700 font-bold">Готово</span>
              ) : (
                <span>{secondsLeft} сек</span>
              )}
            </div>

            <button
              type="button"
              onClick={safeProceed}
              title="Перейти к уроку (Esc)"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Ad Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Ad Container / Creative placeholder */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-slate-50 to-amber-50/40 p-4 sm:p-5 shadow-inner">
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Партнер проекта
              </span>
              <span className="text-[11px] text-slate-400">РСЯ / Интерактивное образование</span>
            </div>

            <div className="my-3 sm:my-4 flex items-center gap-3 sm:gap-4">
              <div className="grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-2xl bg-emerald-800 text-white shadow-md">
                <BookOpen className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  Онлайн-школа для преподавателей
                </h3>
                <p className="mt-1 text-[11px] sm:text-xs text-slate-600 leading-relaxed line-clamp-2">
                  Интерактивные презентации, банк проверочных заданий и олимпиадные материалы по всем предметам.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/70 pt-3 text-xs">
              <span className="font-semibold text-emerald-950 text-[11px] sm:text-xs">Для всех учителей РФ и СНГ</span>
              <a
                href="https://foxford.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950 hover:underline text-[11px] sm:text-xs"
              >
                <span>Подробнее</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex shrink-0 flex-col gap-2.5 border-t border-slate-100 bg-slate-50/80 p-4 sm:px-6">
          <button
            type="button"
            onClick={safeProceed}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold shadow-md transition ${
              canSkip
                ? 'bg-emerald-800 text-white shadow-emerald-950/20 hover:bg-emerald-900 active:scale-[0.99]'
                : 'bg-emerald-800/80 text-white hover:bg-emerald-900'
            }`}
          >
            <span>{canSkip ? 'Перейти к уроку' : `Открыть урок (${secondsLeft} с)`}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Upsell PRO button */}
          <button
            type="button"
            onClick={onOpenSubscription}
            className="group flex items-center justify-center gap-2 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-yellow-50 py-2 text-xs font-bold text-amber-900 shadow-sm transition hover:border-amber-400 hover:bg-amber-100/60 active:scale-[0.99]"
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

