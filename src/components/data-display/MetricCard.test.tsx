import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricCard } from '@/components/data-display/MetricCard';
import { PercentileRail } from '@/components/data-display/PercentileRail';
import { getMetricDefinition } from '@/domain/metrics/definitions';
import type { MetricObservation } from '@/domain/types';

const atr: MetricObservation = {
  metricId: 'vol.atr-pct',
  asOf: '2026-10-12',
  rawValue: 2.7,
  displayValue: '2.7%',
  unit: '%',
  historical: { percentile: 91, sampleSize: 504, lookbackDays: 504, startDate: '2024-10-11' },
  sectorRelative: {
    percentile: 76,
    cohortLabel: 'Technology / Mega Cap',
    sampleSize: 32,
  },
  marketRelative: {
    percentile: 82,
    cohortLabel: 'US Large/Mega Cap',
    sampleSize: 348,
  },
  interpretation: {
    mode: 'EXTREME_CONTEXT',
    state: 'VOL_ELEVATED',
    shortText: 'ATR % is elevated. A high reading means a wider range, not a better stock.',
  },
  dataQuality: { status: 'good' },
  provenance: 'Deterministic mock snapshot',
};

describe('MetricCard', () => {
  it('shows cohort, sample size, and a non-positive risk state', () => {
    render(<MetricCard definition={getMetricDefinition('vol.atr-pct')} observation={atr} />);
    expect(screen.getByText('Elevated')).toHaveAttribute('data-tone', 'caution');
    expect(screen.getByText('91st')).toHaveAttribute('data-role', 'percentile');
    expect(screen.getByText('91st')).not.toHaveAttribute('data-tone');
    expect(screen.getByText('Technology / Mega Cap · n=32')).toBeInTheDocument();
    expect(screen.getByText('US Large/Mega Cap · n=348')).toBeInTheDocument();
    expect(screen.getByText('504 obs')).toBeInTheDocument();
  });
});

describe('PercentileRail', () => {
  it('explains an unavailable historical percentile', () => {
    render(
      <PercentileRail
        label="Self 2Y"
        percentile={null}
        sampleSize={100}
        message="Historical percentile unavailable — requires at least 126 valid observations."
      />,
    );
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/126 valid observations/)).toBeInTheDocument();
  });

  it('shows a fallback cohort', () => {
    render(
      <PercentileRail
        label="Sector"
        percentile={64}
        cohortLabel="Utilities"
        sampleSize={26}
        fallbackDetail="Utilities / Large Cap had n=14, below the minimum of 20."
      />,
    );
    expect(screen.getByText('64th')).toBeInTheDocument();
    expect(screen.getByText('Utilities · n=26')).toBeInTheDocument();
    expect(screen.getByText(/n=14/)).toBeInTheDocument();
  });
});
