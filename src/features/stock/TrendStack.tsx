import { MetricHelp } from '@/components/metrics/MetricHelp';
import { formatPercent, formatPrice } from '@/domain/metrics/format';
import { getMetricDefinition } from '@/domain/metrics/definitions';
import type { StockDetail } from '@/domain/types';

export function TrendStack({ detail }: { detail: StockDetail }) {
  const averages = detail.movingAverages;
  const items = [
    { id: 'price', label: 'Price', value: detail.summary.price, distance: null, slopeId: null, levelId: null },
    { id: 'sma20', label: 'SMA 20', value: averages.sma20, distance: averages.dist20, slopeId: 'trend.slope-sma20', levelId: 'trend.sma20' },
    { id: 'sma50', label: 'SMA 50', value: averages.sma50, distance: averages.dist50, slopeId: 'trend.slope-sma50', levelId: 'trend.sma50' },
    { id: 'sma200', label: 'SMA 200', value: averages.sma200, distance: averages.dist200, slopeId: 'trend.slope-sma200', levelId: 'trend.sma200' },
  ].filter((item): item is typeof item & { value: number } => item.value != null)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="trend-stack-wrap">
      <p className="stack-caption">Ordered from highest to lowest, so the stack itself is the alignment.</p>
      <ol className="trend-stack">
        {items.map((item, index) => (
          <li key={item.id}>
            <span className="rank">{index + 1}</span>
            <span className="stack-label">
              {item.label}
              {item.levelId ? <MetricHelp definition={getMetricDefinition(item.levelId)} /> : null}
            </span>
            <span className="num">{formatPrice(item.value)}</span>
            <span className="num">{item.distance == null ? 'Anchor' : formatPercent(item.distance)}</span>
            {item.slopeId ? (
              <span className="stack-slope">
                {detail.metrics[item.slopeId]?.displayValue ?? '—'}
                <MetricHelp definition={getMetricDefinition(item.slopeId)} />
              </span>
            ) : <span>Latest close</span>}
          </li>
        ))}
      </ol>
      {averages.sma200 == null ? <p className="quality quality-insufficient">SMA 200 unavailable — 200 valid sessions are required.</p> : null}
    </div>
  );
}
