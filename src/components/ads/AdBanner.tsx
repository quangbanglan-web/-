import React, { useEffect, useId, useState } from 'react';
import { Sparkles, X, ExternalLink, Crown } from 'lucide-react';
import { logAdImpression } from '../../utils/ads';

declare global {
  interface Window {
    yaContextCb?: Array<() => void>;
    Ya?: {
      Context?: {
        AdvManager?: {
          render: (params: {
            blockId: string;
            renderTo: string;
            darkTheme?: boolean;
            onRender?: () => void;
            onError?: (error: any) => void;
          }) => void;
        };
      };
    };
  }
}

export interface AdBannerProps {
  isPro?: boolean;
  blockId?: string;
  onOpenSubscription?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  isPro = false,
  blockId = 'R-A-1234567-1',
  onOpenSubscription,
  onVisibilityChange,
  className = '',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const reactId = useId().replace(/:/g, '');
  const containerId = `yandex_rtb_${reactId}`;

  const isVisible = !isPro && !isDismissed;

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  // Load Yandex context script once for RSYA
  useEffect(() => {
    if (!isVisible) return;

    if (!document.getElementById('yandex-context-script')) {
      const script = document.createElement('script');
      script.id = 'yandex-context-script';
      script.src = 'https://yandex.ru/ads/system/context.js';
      script.async = true;
      document.head.appendChild(script);
    }

    window.yaContextCb = window.yaContextCb || [];
    window.yaContextCb.push(() => {
      try {
        if (window.Ya?.Context?.AdvManager) {
          window.Ya.Context.AdvManager.render({
            blockId,
            renderTo: containerId,
            darkTheme: false,
          });
        }
      } catch (err) {
        console.warn('[РСЯ Warning] Failed to render ad block:', err);
      }
    });

    logAdImpression('banner_rsya_dashboard');
  }, [isVisible, blockId, containerId]);

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      aria-label="Рекламный блок РСЯ"
      className={`fixed bottom-0 left-0 right-0 z-40 flex min-h-[54px] items-center justify-between border-t border-slate-200 bg-white/95 px-3 py-2 text-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all sm:px-6 ${className}`}
    >
      {/* Left: Ad badge & creative content / Yandex RTB Container */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
          Реклама РСЯ
        </span>

        {/* Real Yandex RTB container */}
        <div id={containerId} className="yandex-rtb hidden sm:inline-block" />

        {/* Fallback & Promo banner text */}
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="hidden font-bold text-emerald-900 md:inline">Учительский клуб:</span>
          <span className="truncate text-slate-600 sm:max-w-md">
            Курсы повышения квалификации и готовые материалы к урокам 2026
          </span>
          <a
            href="https://foxford.ru"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-0.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline lg:inline-flex"
          >
            <span>Перейти</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Right: Disable ads button (PRO offer) & dismiss button */}
      <div className="flex shrink-0 items-center gap-2 pl-2">
        {onOpenSubscription && (
          <button
            type="button"
            onClick={onOpenSubscription}
            title="Отключить всю рекламу и рекламные паузы"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 px-2.5 py-1.5 text-xs font-bold text-slate-950 shadow-sm transition hover:brightness-105 active:scale-95 sm:px-3 cursor-pointer"
          >
            <Crown className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
            <span className="hidden xs:inline">Отключить за</span>
            <span>99 ₽/мес</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          title="Скрыть баннер"
          className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};

export const BottomBannerAd = AdBanner;
export default AdBanner;
