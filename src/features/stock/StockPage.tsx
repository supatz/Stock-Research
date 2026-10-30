import { lazy, Suspense, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { useStockDataProvider, useToast, useWatchlist } from '@/app/providers';
import { DataTimestamp } from '@/components/data-display/DataTimestamp';
import { MetricSlot } from '@/components/data-display/MetricCard';
import { SignedValue } from '@/components/data-display/SignedValue';
import { StateBadge } from '@/components/data-display/StateBadge';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { ErrorState } from '@/components/feedback/States';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { formatMarketCap, formatPrice } from '@/domain/metrics/format';
import { ReferenceTag } from '@/components/layout/ReferenceTag';
import { FinancialsPanel } from '@/features/stock/FinancialsPanel';
import { Range52WeekCard } from '@/features/stock/Range52WeekCard';
import { RelativeStrengthMatrix } from '@/features/stock/RelativeStrengthMatrix';
import { ResearchBriefPanel } from '@/features/stock/ResearchBriefPanel';
import { TrendStack } from '@/features/stock/TrendStack';
import { useAsync } from '@/lib/useAsync';

const TradingViewPanel = lazy(() => import('@/components/charts/TradingViewPanel'));

function scrollToSection(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

export default function StockPage() {
  const { ticker = '' } = useParams();
  const provider = useStockDataProvider();
  const normalized = ticker.toUpperCase();
  const stockState = useAsync(() => provider.getStockTechnicals(normalized), [provider, normalized]);
  const { addTicker, removeTicker, hasTicker } = useWatchlist();
  const { pushToast } = useToast();

  useEffect(() => {
    if (stockState.data) {
      document.title = `${stockState.data.summary.ticker} · Stock Research`;
    }
  }, [stockState.data]);

  if (stockState.status === 'loading') {
    return <PageSkeleton label={`Loading ${normalized || 'stock'}`} />;
  }
  if (stockState.status === 'error' || !stockState.data) {
    return (
      <ErrorState
        title={stockState.code === 'NOT_FOUND' ? 'Stock not in this snapshot' : 'Stock detail is unavailable'}
        message={stockState.message ?? 'The snapshot could not be read.'}
        action={<Link to="/screener">Back to the screener</Link>}
      />
    );
  }

  const detail = stockState.data;
  const summary = detail.summary;
  const tracked = hasTicker(summary.ticker);
  const capLabel = summary.capTier === 'mega' ? 'Mega cap' : 'Large cap';

  function toggleWatch() {
    if (tracked) {
      removeTicker(summary.ticker);
      pushToast(`Removed ${summary.ticker} from the watchlist`);
    } else {
      addTicker(summary.ticker);
      pushToast(`Added ${summary.ticker} to the watchlist`);
    }
  }

  return (
    <div className="stack">
      <header id="section.stock.header" className="page-header section-header">
        <p className="kicker">Stock Detail · {summary.exchange} · {summary.market}</p>
        <div className="section-heading">
          <h1>
            <span className="ticker-display">{summary.ticker}</span>
            {' '}
            <span className="company-display">{summary.company}</span>
          </h1>
          <ReferenceTag referenceId="page.stock" />
        </div>
        <p className="identity-line">{summary.sector} · {summary.industry} · {capLabel} · {formatMarketCap(summary.marketCap)}</p>
        <div className="price-line">
          <p className="metric-value">{formatPrice(summary.price)}</p>
          <SignedValue value={summary.dailyChangePct} />
          <span className={`num ${summary.dailyChange >= 0 ? 'signed-up' : 'signed-down'}`}>
            {summary.dailyChange >= 0 ? '+' : ''}{summary.dailyChange.toFixed(2)}
          </span>
        </div>
        <div className="header-actions">
          <DataTimestamp asOf={summary.asOf} stale={summary.quality === 'stale'} />
          <button type="button" className="text-button" onClick={toggleWatch} aria-pressed={tracked}>
            {tracked ? 'Remove from watchlist' : 'Add to watchlist'}
          </button>
        </div>
        {summary.qualityMessage ? <p className={`quality quality-${summary.quality}`} role="status">{summary.qualityMessage}</p> : null}
      </header>

      <ResearchBriefPanel detail={detail} />

      <section id="section.stock.snapshot" className="section-block" aria-labelledby="section.stock.snapshot-title">
        <SectionHeader referenceId="section.stock.snapshot" description="Six separate readings. They do not collapse into a score." />
        <div className="ribbon">
          {detail.dimensions.map((dimension) => (
            <button
              key={dimension.id}
              type="button"
              className="ribbon-card"
              title={dimension.shortText}
              aria-label={`${dimension.label}: ${dimension.state}. ${dimension.shortText}`}
              onClick={() => scrollToSection(dimension.sectionId)}
            >
              <span className="ribbon-label">{dimension.label}</span>
              <StateBadge state={dimension.state} />
              <span className="ribbon-primary">{dimension.primary}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="section.stock.chart" className="section-block" aria-labelledby="section.stock.chart-title">
        <SectionHeader
          referenceId="section.stock.chart"
          description={`Embedded TradingView chart for ${summary.exchange}:${summary.ticker}.`}
        />
        <div className="chart-slot tv-slot">
          <Suspense fallback={<PageSkeleton label="Loading TradingView" />}>
            <TradingViewPanel ticker={summary.ticker} exchange={summary.exchange} />
          </Suspense>
        </div>
      </section>

      <section id="section.stock.price-performance" className="section-block" aria-labelledby="section.stock.price-performance-title">
        <SectionHeader referenceId="section.stock.price-performance" description={detail.takeaways.performance} />
        <div className="card-grid">
          {['return.1m', 'return.3m', 'return.6m', 'return.1y'].map((id) => (
            <MetricSlot key={id} id={id} metrics={detail.metrics} />
          ))}
          <Range52WeekCard
            high={detail.metrics['distance.52w-high']}
            low={detail.metrics['distance.52w-low']}
          />
        </div>
      </section>

      <section id="section.stock.financials" className="section-block" aria-labelledby="section.stock.financials-title">
        <SectionHeader referenceId="section.stock.financials" />
        <FinancialsPanel financials={detail.financials} />
      </section>

      <section id="section.stock.trend" className="section-block" aria-labelledby="section.stock.trend-title">
        <SectionHeader referenceId="section.stock.trend" description={detail.takeaways.trend} />
        <TrendStack detail={detail} />
        <div className="card-grid">
          {['trend.alignment', 'trend.dist-sma20', 'trend.dist-sma50', 'trend.dist-sma200', 'trend.adx'].map((id) => (
            <MetricSlot key={id} id={id} metrics={detail.metrics} />
          ))}
        </div>
      </section>

      <section id="section.stock.momentum" className="section-block" aria-labelledby="section.stock.momentum-title">
        <SectionHeader referenceId="section.stock.momentum" description={detail.takeaways.momentum} />
        <div className="card-grid">
          {['momentum.rsi14', 'momentum.macd', 'momentum.macd-signal', 'momentum.macd-histogram', 'momentum.roc20', 'momentum.roc63'].map((id) => (
            <MetricSlot key={id} id={id} metrics={detail.metrics} />
          ))}
        </div>
      </section>

      <section id="section.stock.relative-strength" className="section-block" aria-labelledby="section.stock.relative-strength-title">
        <SectionHeader referenceId="section.stock.relative-strength" description={detail.takeaways.relativeStrength} />
        <div className="card-grid single">
          <MetricSlot id="rs.state" metrics={detail.metrics} />
        </div>
        <RelativeStrengthMatrix metrics={detail.metrics} sectorEtf={detail.relativeStrength.sectorEtf} />
      </section>

      <section id="section.stock.volatility" className="section-block" aria-labelledby="section.stock.volatility-title">
        <SectionHeader referenceId="section.stock.volatility" description={detail.takeaways.volatility} />
        <div className="card-grid">
          {['vol.atr-pct', 'vol.realized-20d', 'vol.realized-60d', 'vol.bb-width', 'vol.drawdown', 'vol.max-drawdown-1y'].map((id) => (
            <MetricSlot key={id} id={id} metrics={detail.metrics} />
          ))}
        </div>
      </section>

      <section id="section.stock.volume" className="section-block" aria-labelledby="section.stock.volume-title">
        <SectionHeader referenceId="section.stock.volume" description={detail.takeaways.volume} />
        <div className="card-grid">
          {['volume.daily', 'volume.avg-20d', 'volume.rvol', 'volume.dollar-avg-20d', 'volume.cmf-20d'].map((id) => (
            <MetricSlot key={id} id={id} metrics={detail.metrics} />
          ))}
        </div>
      </section>

      <section id="section.stock.price-structure" className="section-block" aria-labelledby="section.stock.price-structure-title">
        <SectionHeader referenceId="section.stock.price-structure" description={detail.takeaways.structure} />
        <div className="card-grid">
          {['structure.20d', 'structure.55d', 'structure.breakout'].map((id) => (
            <MetricSlot key={id} id={id} metrics={detail.metrics} />
          ))}
          <Range52WeekCard
            high={detail.metrics['distance.52w-high']}
            low={detail.metrics['distance.52w-low']}
          />
        </div>
      </section>

      <section id="section.stock.market-context" className="section-block" aria-labelledby="section.stock.market-context-title">
        <SectionHeader referenceId="section.stock.market-context" description={detail.takeaways.market} />
        <div className="card-grid">
          <MetricSlot id="market.sector-vs-spy" metrics={detail.metrics} />
        </div>
        <p className="section-link"><Link to="/market">Open the market page</Link> for the full regime, index, and breadth view.</p>
      </section>
    </div>
  );
}
