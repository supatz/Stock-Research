import { useEffect, useId, useRef } from 'react';

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => { remove?: () => void };
    };
  }
}

function safeRemoveWidget(widget: { remove?: () => void } | null | undefined) {
  if (!widget?.remove) return;
  try {
    widget.remove();
  } catch {
    // tv.js can throw if the iframe/host was already detached during route changes.
  }
}

/** Public TradingView Advanced Chart widget for the active symbol. */
export default function TradingViewPanel({
  ticker,
  exchange: _exchange,
}: {
  ticker: string;
  /** Kept for call-site compatibility; chart uses bare ticker only. */
  exchange?: 'NYSE' | 'NASDAQ';
}) {
  const symbol = ticker.toUpperCase();
  const hostId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<{ remove?: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      await loadTradingViewScript();
      if (cancelled || !window.TradingView || !containerRef.current) return;

      safeRemoveWidget(widgetRef.current);
      widgetRef.current = null;
      containerRef.current.innerHTML = '';

      const mountNode = document.createElement('div');
      mountNode.id = `tv-widget-${hostId}`;
      mountNode.style.height = '100%';
      containerRef.current.appendChild(mountNode);

      const widget = new window.TradingView.widget({
        autosize: true,
        symbol,
        interval: 'D',
        timezone: 'America/New_York',
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        allow_symbol_change: false,
        hide_side_toolbar: false,
        withdateranges: true,
        details: false,
        hotlist: false,
        calendar: false,
        container_id: mountNode.id,
      });

      if (cancelled) {
        safeRemoveWidget(widget);
        if (containerRef.current) containerRef.current.innerHTML = '';
        return;
      }
      widgetRef.current = widget;
    }

    void mount();
    return () => {
      cancelled = true;
      safeRemoveWidget(widgetRef.current);
      widgetRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [hostId, symbol]);

  return (
    <div className="tv-panel">
      <div className="tv-embed-shell">
        <div ref={containerRef} className="tv-embed-host" />
      </div>
    </div>
  );
}

let tradingViewScriptPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (window.TradingView) return Promise.resolve();
  if (tradingViewScriptPromise) return tradingViewScriptPromise;
  tradingViewScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-tv-widget="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('TradingView script failed')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.dataset.tvWidget = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('TradingView script failed to load'));
    document.head.appendChild(script);
  });
  return tradingViewScriptPromise;
}
