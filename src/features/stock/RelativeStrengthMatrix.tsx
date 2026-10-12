import { PercentileRail } from '@/components/data-display/PercentileRail';
import { StateBadge } from '@/components/data-display/StateBadge';
import { MetricHelp } from '@/components/metrics/MetricHelp';
import { getMetricDefinition } from '@/domain/metrics/definitions';
import type { MetricObservation } from '@/domain/types';

const HORIZONS = [
  ['1M', '1m'],
  ['3M', '3m'],
  ['6M', '6m'],
  ['12M', '12m'],
] as const;

function Cell({ observation }: { observation: MetricObservation | undefined }) {
  if (!observation) return <td>—</td>;
  const definition = getMetricDefinition(observation.metricId);
  return (
    <td>
      <div className="matrix-cell">
        <div className="matrix-cell-top">
          <span className="num">{observation.displayValue}</span>
          <MetricHelp definition={definition} />
        </div>
        <StateBadge state={observation.interpretation.state} />
        {observation.historical ? (
          <PercentileRail
            label="Self"
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
    </td>
  );
}

export function RelativeStrengthMatrix({
  metrics,
  sectorEtf,
}: {
  metrics: Record<string, MetricObservation>;
  sectorEtf: string;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table rs-matrix">
        <caption className="sr-only">Relative performance versus SPY and {sectorEtf}</caption>
        <thead>
          <tr>
            <th scope="col">Benchmark</th>
            {HORIZONS.map(([label]) => <th key={label} scope="col">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">vs SPY</th>
            {HORIZONS.map(([, key]) => <Cell key={key} observation={metrics[`rs.spy.${key}`]} />)}
          </tr>
          <tr>
            <th scope="row">vs {sectorEtf}</th>
            {HORIZONS.map(([, key]) => <Cell key={key} observation={metrics[`rs.sector.${key}`]} />)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
