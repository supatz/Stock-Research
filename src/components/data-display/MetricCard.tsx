import { getMetricDefinition } from '@/domain/metrics/definitions';
import { formatAsOf } from '@/domain/metrics/format';
import type { MetricDefinition, MetricObservation } from '@/domain/types';
import { PercentileRail } from '@/components/data-display/PercentileRail';
import { StateBadge } from '@/components/data-display/StateBadge';
import { MetricHelp } from '@/components/metrics/MetricHelp';

export function MetricCard({
  definition,
  observation,
  variant = 'default',
}: {
  definition: MetricDefinition;
  observation: MetricObservation;
  variant?: 'default' | 'compact';
}) {
  const quality = observation.dataQuality;
  return (
    <article className={variant === 'compact' ? 'metric-card is-compact' : 'metric-card'}>
      <div className="metric-label-row">
        <h3>{definition.label}</h3>
        <MetricHelp definition={definition} />
      </div>
      <div className="metric-value-row">
        <p className="metric-value">{observation.displayValue}</p>
        <StateBadge state={observation.interpretation.state} />
      </div>
      <p className="metric-reading">{observation.interpretation.shortText}</p>
      <div className="percentile-grid">
        {observation.historical ? (
          <PercentileRail
            label="Self 2Y"
            percentile={observation.historical.percentile}
            sampleSize={observation.historical.sampleSize}
            message={observation.historical.message}
          />
        ) : null}
        {observation.sectorRelative ? (
          <PercentileRail
            label="Sector"
            percentile={observation.sectorRelative.percentile}
            cohortLabel={observation.sectorRelative.cohortLabel}
            sampleSize={observation.sectorRelative.sampleSize}
            fallbackDetail={observation.sectorRelative.fallbackDetail}
            message={observation.sectorRelative.message}
          />
        ) : null}
        {observation.marketRelative ? (
          <PercentileRail
            label="Market"
            percentile={observation.marketRelative.percentile}
            cohortLabel={observation.marketRelative.cohortLabel}
            sampleSize={observation.marketRelative.sampleSize}
            fallbackDetail={observation.marketRelative.fallbackDetail}
            message={observation.marketRelative.message}
          />
        ) : null}
      </div>
      {quality && quality.status !== 'good' && quality.message ? (
        <p className={`quality quality-${quality.status}`} role="status">{quality.message}</p>
      ) : null}
      <p className="as-of">As of {formatAsOf(observation.asOf)}</p>
    </article>
  );
}

export function MetricSlot({
  id,
  metrics,
}: {
  id: string;
  metrics: Record<string, MetricObservation>;
}) {
  const definition = getMetricDefinition(id);
  const observation = metrics[id];
  if (!observation) {
    return (
      <article className="metric-card">
        <h3>{definition.label}</h3>
        <p className="metric-value">—</p>
      </article>
    );
  }
  return <MetricCard definition={definition} observation={observation} />;
}
