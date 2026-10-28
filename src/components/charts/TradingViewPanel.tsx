import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { TRADINGVIEW_CHART_ID } from '@/domain/config';

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => { remove?: () => void };
    };
  }
}

type ChartMode = 'my-chart' | 'embedded';

const CHART_LAYOUT_ID =
  import.meta.env.VITE_TRADINGVIEW_CHART_ID?.trim() || TRADINGVIEW_CHART_ID;

function tradingViewSymbol(exchange: 'NYSE' | 'NASDAQ', ticker: string): string {
  return `${exchange}:${ticker.toUpperCase()}`;
}

function myChartUrl(exchange: 'NYSE' | 'NASDAQ', ticker: string): string {
  const symbol = encodeURIComponent(tradingViewSymbol(exchange, ticker));
  return `https://www.tradingview.com/chart/${CHART_LAYOUT_ID}/?symbol=${symbol}`;
}

/**
 * TradingView’s full chart product usually refuses iframe embedding and may
 * block third-party login cookies inside frames. Personal support/resistance
 * drawings live on the signed-in chart layout, so “My chart” opens that layout
 * in a dedicated window/tab. The embedded mode uses TradingView’s public
 * widget for an in-page chart without account drawings.
 */
export default function TradingViewPanel({
  ticker,
  exchange,
}: {
  ticker: string;
  exchange: 'NYSE' | 'NASDAQ';
}) {
  const [mode, setMode] = useState<ChartMode>('my-chart');
  const symbol = useMemo(() => tradingViewSymbol(exchange, ticker), [exchange, ticker]);
  const chartHref = useMemo(() => myChartUrl(exchange, ticker), [exchange, ticker]);

  return (
    <div className="tv-panel">
      <div className="chart-toolbar" role="toolbar" aria-label="Chart source">
        <div className="segmented" role="group" aria-label="Chart mode">
          <button
            type="button"
            aria-pressed={mode === 'my-chart'}
            onClick={() => setMode('my-chart')}
          >
            My TradingView
          </button>
          <button
            type="button"
            aria-pressed={mode === 'embedded'}
            onClick={() => setMode('embedded')}
          >
            Embedded chart
          </button>
        </div>
        <a className="text-button" href={chartHref} target="_blank" rel="noreferrer">
          Open {ticker} in TradingView
        </a>
      </div>

      {mode === 'my-chart' ? (
        <MyTradingViewFrame ticker={ticker} symbol={symbol} href={chartHref} />
      ) : (
        <EmbeddedTradingViewWidget symbol={symbol} />
      )}
    </div>
  );
}

function MyTradingViewFrame({
  ticker,
  symbol,
  href,
}: {
  ticker: string;
  symbol: string;
  href: string;
}) {
  return (
    <div className="tv-frame-shell">
      <div className="tv-browser-chrome" aria-hidden="true">
        <span className="tv-dot" />
        <span className="tv-dot" />
        <span className="tv-dot" />
        <span className="tv-url">{href.replace('https://', '')}</span>
      </div>
      <div className="tv-frame-body">
        {/* Attempted embed: TradingView commonly sets X-Frame-Options / CSP that
            blocks this. Keep the iframe for cases where it works; always provide
            the open action for drawings + login. */}
        <iframe
          title={`TradingView chart for ${ticker}`}
          src={href}
          className="tv-iframe"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
        />
        <div className="tv-overlay">
          <div className="tv-overlay-card">
            <p className="tv-overlay-kicker">{symbol}</p>
            <h3>Open your chart to see drawings</h3>
            <p>
              Support, resistance, and trend lines drawn in your TradingView account
              live on layout <code>{CHART_LAYOUT_ID}</code>. TradingView usually
              blocks embedding that full chart (and login) inside another site, so
              this panel cannot reliably act as a logged-in browser.
            </p>
            <p>
              Click below to open the same URL in a normal TradingView tab. If you
              are already signed in there, your drawings stay with the layout.
            </p>
            <div className="tv-overlay-actions">
              <a className="primary-button" href={href} target="_blank" rel="noreferrer">
                Open my {ticker} chart
              </a>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  window.open(href, `tv-${ticker}`, 'noopener,noreferrer,width=1400,height=900');
                }}
              >
                Open in popup window
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmbeddedTradingViewWidget({ symbol }: { symbol: string }) {
  const hostId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<{ remove?: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      await loadTradingViewScript();
      if (cancelled || !window.TradingView || !containerRef.current) return;
      widgetRef.current?.remove?.();
      containerRef.current.innerHTML = '';
      const mountNode = document.createElement('div');
      mountNode.id = `tv-widget-${hostId}`;
      mountNode.style.height = '100%';
      containerRef.current.appendChild(mountNode);
      widgetRef.current = new window.TradingView.widget({
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
    }

    void mount();
    return () => {
      cancelled = true;
      widgetRef.current?.remove?.();
      widgetRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [hostId, symbol]);

  return (
    <div className="tv-embed-shell">
      <p className="tv-embed-note muted">
        Public TradingView widget for {symbol}. This in-page chart does not include
        your private drawings or account login.
      </p>
      <div ref={containerRef} className="tv-embed-host" />
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
