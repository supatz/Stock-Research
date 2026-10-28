import { MetricHelp } from '@/components/metrics/MetricHelp';
import { StateBadge } from '@/components/data-display/StateBadge';
import { getMetricDefinition } from '@/domain/metrics/definitions';
import { formatAsOf, formatPercent } from '@/domain/metrics/format';
import type { MetricObservation } from '@/domain/types';

/**
 * Single card for 52-week positioning: distance from high and low together.
 */
export function Range52WeekCard({
  high,
  low,
}: {
  high?: MetricObservation;
  low?: MetricObservation;
}) {
  const helpDefinition = getMetricDefinition('distance.52w-high');
  const distHigh = typeof high?.rawValue === 'number' ? high.rawValue : null;
  const distLow = typeof low?.rawValue === 'number' ? low.rawValue : null;
  const position = rangePosition(distHigh, distLow);
  const state = high?.interpretation.state ?? low?.interpretation.state ?? 'UNAVAILABLE';
  const asOf = high?.asOf ?? low?.asOf;

  return (
    <article className="metric-card range-card">
      <div className="metric-label-row">
        <h3>52-week range</h3>
        <MetricHelp
          definition={{
            ...helpDefinition,
            id: 'distance.52w-range',
            label: '52-week range',
            help: {
              ...helpDefinition.help,
              metricId: 'distance.52w-range',
              title: '52-week range',
              plainEnglish:
                'Where the latest close sits between the 52-week low and 52-week high, shown as one reading instead of two separate cards.',
            },
          }}
        />
      </div>
      <div className="metric-value-row">
        <p className="metric-value">{position == null ? '—' : `${Math.round(position * 100)}% of range`}</p>
        <StateBadge state={state} />
      </div>
      <div className="range-split">
        <div>
          <p className="range-label">From high</p>
          <p className={`num metric-subvalue ${toneClass(distHigh)}`}>{formatPercent(distHigh)}</p>
        </div>
        <div>
          <p className="range-label">From low</p>
          <p className={`num metric-subvalue ${toneClass(distLow)}`}>{formatPercent(distLow)}</p>
        </div>
      </div>
      <div className="range-track" aria-hidden="true">
        <span className="range-fill" style={{ width: `${(position ?? 0) * 100}%` }} />
        <span className="range-marker" style={{ left: `${(position ?? 0) * 100}%` }} />
      </div>
      <p className="metric-reading">
        {high?.interpretation.shortText || low?.interpretation.shortText || '52-week distances are unavailable for this snapshot.'}
      </p>
      {asOf ? <p className="as-of">As of {formatAsOf(asOf)}</p> : null}
    </article>
  );
}

function rangePosition(distHigh: number | null, distLow: number | null): number | null {
  if (distHigh == null || distLow == null) return null;
  const fromLow = Math.max(0, distLow);
  const fromHigh = Math.max(0, -distHigh);
  const span = fromLow + fromHigh;
  if (span <= 0) return distHigh >= -0.0001 ? 1 : 0;
  return Math.min(1, Math.max(0, fromLow / span));
}

function toneClass(value: number | null): string {
  if (value == null) return '';
  if (value > 0) return 'signed-up';
  if (value < 0) return 'signed-down';
  return '';
}
