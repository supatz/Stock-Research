import { StateBadge } from '@/components/data-display/StateBadge';
import { formatMarketCap, formatNumber, formatPrice } from '@/domain/metrics/format';
import type { KeyStatistics, ValuationBand } from '@/domain/types';

function bandState(band: ValuationBand | null): string {
  if (band === 'low') return 'VALUATION_LOW';
  if (band === 'high') return 'VALUATION_HIGH';
  if (band === 'average') return 'VALUATION_AVERAGE';
  return 'UNAVAILABLE';
}

export function KeyStatisticsPanel({
  stats,
  price,
}: {
  stats: KeyStatistics;
  price: number;
}) {
  const items = [
    {
      id: 'pe',
      label: 'P/E',
      value: stats.pe == null ? '—' : formatNumber(stats.pe, 1),
      badge: bandState(stats.peBand),
      detail: stats.peAverage == null ? 'Average P/E unavailable' : `Own average ${formatNumber(stats.peAverage, 1)}`,
    },
    {
      id: 'sector-pe',
      label: 'Sector P/E',
      value: stats.sectorPe == null ? '—' : formatNumber(stats.sectorPe, 1),
      badge: null as string | null,
      detail: stats.pe == null || stats.sectorPe == null
        ? 'Compare when both values are present'
        : stats.pe < stats.sectorPe
          ? 'Below sector multiple'
          : stats.pe > stats.sectorPe
            ? 'Above sector multiple'
            : 'In line with sector',
    },
    {
      id: 'pb',
      label: 'P/B',
      value: stats.pb == null ? '—' : formatNumber(stats.pb, 2),
      badge: bandState(stats.pbBand),
      detail: stats.pbAverage == null ? 'Average P/B unavailable' : `Own average ${formatNumber(stats.pbAverage, 2)}`,
    },
    {
      id: 'beta',
      label: 'Beta',
      value: stats.beta == null ? '—' : formatNumber(stats.beta, 2),
      badge: null,
      detail: 'Vs broad market (mock)',
    },
    {
      id: 'mcap',
      label: 'Market cap',
      value: formatMarketCap(stats.marketCap),
      badge: null,
      detail: `Last ${formatPrice(price)}`,
    },
    {
      id: 'high',
      label: '52W high',
      value: stats.week52High == null ? '—' : formatPrice(stats.week52High),
      badge: null,
      detail: stats.week52High == null ? 'Unavailable' : `${formatNumber(((price / stats.week52High) - 1) * 100, 1)}% from high`,
    },
    {
      id: 'low',
      label: '52W low',
      value: stats.week52Low == null ? '—' : formatPrice(stats.week52Low),
      badge: null,
      detail: stats.week52Low == null ? 'Unavailable' : `+${formatNumber(((price / stats.week52Low) - 1) * 100, 1)}% from low`,
    },
    {
      id: 'vwap',
      label: 'VWAP',
      value: stats.vwap == null ? '—' : formatPrice(stats.vwap),
      badge: stats.vwapVsPricePct == null
        ? null
        : stats.vwapVsPricePct > 0.15
          ? 'VWAP_ABOVE'
          : stats.vwapVsPricePct < -0.15
            ? 'VWAP_BELOW'
            : 'VWAP_AT',
      detail: stats.vwapVsPricePct == null ? 'Unavailable' : `Price vs VWAP ${formatNumber(stats.vwapVsPricePct, 2)}%`,
    },
  ];

  return (
    <div className="key-stats-grid">
      {items.map((item) => (
        <article key={item.id} className="key-stat-card">
          <p className="range-label">{item.label}</p>
          <div className="metric-value-row">
            <p className="metric-value">{item.value}</p>
            {item.badge ? <StateBadge state={item.badge} /> : null}
          </div>
          <p className="metric-reading">{item.detail}</p>
        </article>
      ))}
    </div>
  );
}
