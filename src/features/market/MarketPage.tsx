import { Link } from 'react-router';
import { useStockDataProvider } from '@/app/providers';
import { DataTimestamp } from '@/components/data-display/DataTimestamp';
import { MetricCard } from '@/components/data-display/MetricCard';
import { SignedValue } from '@/components/data-display/SignedValue';
import { StateBadge } from '@/components/data-display/StateBadge';
import { ErrorState } from '@/components/feedback/States';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { PageHeader, SectionHeader } from '@/components/layout/SectionHeader';
import { getMetricDefinition } from '@/domain/metrics/definitions';
import { formatPrice } from '@/domain/metrics/format';
import type { MetricObservation } from '@/domain/types';
import { useAsync } from '@/lib/useAsync';

function byId(metrics: MetricObservation[]) {
  return Object.fromEntries(metrics.map((metric) => [metric.metricId, metric]));
}

export default function MarketPage() {
  const provider = useStockDataProvider();
  const state = useAsync(() => provider.getMarketOverview(), [provider]);

  if (state.status === 'loading') return <PageSkeleton label="Loading market overview" />;
  if (state.status === 'error' || !state.data) {
    return <ErrorState title="Market data is unavailable" message={state.message ?? 'The snapshot could not be read.'} />;
  }

  const overview = state.data;
  const metrics = byId(overview.metrics);

  return (
    <div className="stack">
      <PageHeader referenceId="page.market" kicker="United States · end of day">
        <p className="lede">{overview.regime.summary}</p>
        <DataTimestamp asOf={overview.asOf} />
      </PageHeader>

      <section id="section.market.regime" className="section-block" aria-labelledby="section.market.regime-title">
        <SectionHeader referenceId="section.market.regime" description={overview.regime.summary} />
        <div className="regime-lead">
          <StateBadge state={overview.regime.state} />
          <p>Illustrative coverage uses the names in this demo, not a live index membership list.</p>
        </div>
        <div className="card-grid">
          {['market.spy-vs-50dma', 'market.spy-vs-200dma', 'market.qqq-vs-200dma', 'market.breadth-50dma', 'market.breadth-200dma', 'market.vix'].map((id) => (
            metrics[id] ? <MetricCard key={id} definition={getMetricDefinition(id)} observation={metrics[id]} /> : null
          ))}
        </div>
      </section>

      <section id="section.market.indices" className="section-block" aria-labelledby="section.market.indices-title">
        <SectionHeader referenceId="section.market.indices" description="Index levels are computed from the same mock price paths as the relative-strength benchmarks." />
        <div className="index-grid">
          {overview.indices.map((quote) => (
            <article key={quote.ticker} className="index-card">
              <div className="index-top">
                <h3>{quote.ticker}</h3>
                <span className="muted">{quote.name}</span>
              </div>
              <p className="metric-value">{formatPrice(quote.price)}</p>
              <SignedValue value={quote.changePct} />
              <p className="index-distance">50DMA <SignedValue value={quote.vs50} /> · 200DMA <SignedValue value={quote.vs200} /></p>
              <StateBadge state={quote.trendState} />
            </article>
          ))}
        </div>
      </section>

      <section id="section.market.sectors" className="section-block" aria-labelledby="section.market.sectors-title">
        <SectionHeader referenceId="section.market.sectors" description="Ranked by three-month return versus SPY. The rank number carries the order; color only repeats the sign." />
        <div className="table-scroll">
          <table className="data-table">
            <caption className="sr-only">Sector ETF leadership</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Sector</th>
                <th scope="col">ETF</th>
                <th scope="col" className="num-col">1D</th>
                <th scope="col" className="num-col">1M</th>
                <th scope="col" className="num-col">3M vs SPY</th>
                <th scope="col">Trend</th>
              </tr>
            </thead>
            <tbody>
              {overview.sectors.map((sector, index) => (
                <tr key={sector.ticker}>
                  <td>{index + 1}</td>
                  <th scope="row">{sector.name}</th>
                  <td>{sector.ticker}</td>
                  <td className="num-col"><SignedValue value={sector.changePct} /></td>
                  <td className="num-col"><SignedValue value={sector.return1m} /></td>
                  <td className="num-col">
                    <SignedValue value={sector.rs3mVsSpy} />
                    <span className="inline-bar" style={{ width: `${Math.min(100, Math.abs(sector.rs3mVsSpy ?? 0) * 4)}%` }} />
                  </td>
                  <td><StateBadge state={sector.trendState} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="section.market.breadth" className="section-block" aria-labelledby="section.market.breadth-title">
        <SectionHeader
          referenceId="section.market.breadth"
          description={`${overview.breadth.above50Count} of ${overview.breadth.above50Sample} illustrated names are above their 50-day average. Stale prices are excluded.`}
        />
        <div className="card-grid">
          {['market.breadth-50dma', 'market.breadth-200dma', 'market.highs-20d', 'market.lows-20d'].map((id) => (
            metrics[id] ? <MetricCard key={id} definition={getMetricDefinition(id)} observation={metrics[id]} /> : null
          ))}
        </div>
        <p className="section-link"><Link to="/screener">Open the screener</Link> to see which names sit in this tape.</p>
      </section>
    </div>
  );
}
