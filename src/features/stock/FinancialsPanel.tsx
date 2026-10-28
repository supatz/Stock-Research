import { useMemo, useState } from 'react';
import { formatDollars, formatNumber, formatPercent } from '@/domain/metrics/format';
import type { FinancialPeriod, StockFinancials } from '@/domain/types';

type ChartMetric = 'revenue' | 'netIncome' | 'eps' | 'freeCashFlow';

const METRIC_OPTIONS: Array<{ id: ChartMetric; label: string }> = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'netIncome', label: 'Net income' },
  { id: 'eps', label: 'EPS' },
  { id: 'freeCashFlow', label: 'Free cash flow' },
];

export function FinancialsPanel({ financials }: { financials: StockFinancials }) {
  const [metric, setMetric] = useState<ChartMetric>('revenue');
  const periods = financials.periods;

  return (
    <div className="financials-panel">
      <p className="takeaway">{financials.takeaway}</p>
      <div className="chart-toolbar">
        <div className="segmented" role="group" aria-label="Financial chart metric">
          {METRIC_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={metric === option.id}
              onClick={() => setMetric(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="muted">Bars = selected metric · Line = operating margin</p>
      </div>
      <FinancialComboChart periods={periods} metric={metric} currency={financials.currency} />
      <div className="table-scroll">
        <table className="data-table financials-table">
          <caption className="sr-only">Annual financial summary for easy scanning</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Revenue</th>
              <th scope="col">Net income</th>
              <th scope="col">EPS</th>
              <th scope="col">Gross margin</th>
              <th scope="col">Op. margin</th>
              <th scope="col">Free cash flow</th>
            </tr>
          </thead>
          <tbody>
            {[...periods].reverse().map((row) => (
              <tr key={row.period}>
                <th scope="row">{row.period}</th>
                <td className="num">{formatDollars(row.revenue)}</td>
                <td className={`num ${signedClass(row.netIncome)}`}>{formatDollars(row.netIncome)}</td>
                <td className={`num ${signedClass(row.eps)}`}>{formatNumber(row.eps, 2)}</td>
                <td className="num">{formatPercent(row.grossMargin, 1, false)}</td>
                <td className={`num ${signedClass(row.operatingMargin)}`}>{formatPercent(row.operatingMargin, 1, false)}</td>
                <td className={`num ${signedClass(row.freeCashFlow)}`}>{formatDollars(row.freeCashFlow)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="provenance">Source: {financials.provenance}</p>
    </div>
  );
}

function signedClass(value: number): string {
  if (value > 0) return 'signed-up';
  if (value < 0) return 'signed-down';
  return '';
}

function FinancialComboChart({
  periods,
  metric,
  currency,
}: {
  periods: FinancialPeriod[];
  metric: ChartMetric;
  currency: string;
}) {
  const geometry = useMemo(() => {
    const width = 760;
    const height = 280;
    const pad = { top: 24, right: 48, bottom: 36, left: 56 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const values = periods.map((period) => period[metric]);
    const margins = periods.map((period) => period.operatingMargin);
    const minBar = Math.min(0, ...values);
    const maxBar = Math.max(0, ...values);
    const barSpan = maxBar - minBar || 1;
    const minMargin = Math.min(...margins, 0);
    const maxMargin = Math.max(...margins, 0);
    const marginSpan = maxMargin - minMargin || 1;
    const slot = innerW / periods.length;
    const barWidth = Math.min(42, slot * 0.55);

    const bars = periods.map((period, index) => {
      const value = period[metric];
      const x = pad.left + slot * index + (slot - barWidth) / 2;
      const y0 = pad.top + ((maxBar - 0) / barSpan) * innerH;
      const y1 = pad.top + ((maxBar - value) / barSpan) * innerH;
      return {
        period: period.period,
        value,
        x,
        width: barWidth,
        y: Math.min(y0, y1),
        height: Math.max(2, Math.abs(y1 - y0)),
        positive: value >= 0,
      };
    });

    const linePoints = periods.map((period, index) => {
      const x = pad.left + slot * index + slot / 2;
      const y = pad.top + ((maxMargin - period.operatingMargin) / marginSpan) * innerH;
      return { x, y, value: period.operatingMargin, period: period.period };
    });

    const linePath = linePoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(' ');

    return { width, height, pad, bars, linePoints, linePath, zeroY: pad.top + ((maxBar - 0) / barSpan) * innerH };
  }, [metric, periods]);

  const formatAxis = (value: number) => {
    if (metric === 'eps') return formatNumber(value, 2);
    return formatDollars(value);
  };

  return (
    <figure className="financial-chart-frame">
      <svg
        className="financial-chart"
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        role="img"
        aria-label={`${METRIC_OPTIONS.find((item) => item.id === metric)?.label ?? metric} bars with operating-margin line`}
      >
        <line
          className="grid-line"
          x1={geometry.pad.left}
          x2={geometry.width - geometry.pad.right}
          y1={geometry.zeroY}
          y2={geometry.zeroY}
        />
        {geometry.bars.map((bar) => (
          <g key={bar.period}>
            <rect
              className={bar.positive ? 'fin-bar up' : 'fin-bar down'}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={4}
            >
              <title>{`${bar.period}: ${formatAxis(bar.value)} ${currency}`}</title>
            </rect>
            <text className="axis-label" x={bar.x + bar.width / 2} y={geometry.height - 12} textAnchor="middle">
              {bar.period.replace('FY', '')}
            </text>
          </g>
        ))}
        <path className="fin-line" d={geometry.linePath} fill="none" />
        {geometry.linePoints.map((point) => (
          <circle key={point.period} className="fin-line-dot" cx={point.x} cy={point.y} r={3.5}>
            <title>{`${point.period} operating margin ${formatPercent(point.value, 1, false)}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="sr-only">
        Combination chart of {metric} as bars and operating margin as a line across {periods.length} fiscal years.
      </figcaption>
      <ul className="chart-legend">
        <li><span className="swatch fin-bar-swatch" aria-hidden="true" /> Selected metric ({currency})</li>
        <li><span className="swatch fin-line-swatch" aria-hidden="true" /> Operating margin</li>
      </ul>
    </figure>
  );
}
