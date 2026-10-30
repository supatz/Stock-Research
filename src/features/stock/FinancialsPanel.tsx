import { useMemo, useState } from 'react';
import { formatDollars, formatNumber, formatPercent } from '@/domain/metrics/format';
import type { FinancialPeriod, StockFinancials } from '@/domain/types';

type ChartMetric = 'revenue' | 'netIncome' | 'eps' | 'freeCashFlow';
type Frequency = 'annual' | 'quarterly';
type ViewMode = 'combo' | 'spider';

const METRIC_OPTIONS: Array<{ id: ChartMetric; label: string; help: string }> = [
  { id: 'revenue', label: 'Revenue', help: 'Top-line sales for the period.' },
  { id: 'netIncome', label: 'Net income', help: 'Bottom-line profit after expenses and taxes.' },
  { id: 'eps', label: 'EPS', help: 'Earnings per share for the period.' },
  { id: 'freeCashFlow', label: 'Free cash flow', help: 'Cash left after operating needs and capex.' },
];

export function FinancialsPanel({ financials }: { financials: StockFinancials }) {
  const [metric, setMetric] = useState<ChartMetric>('revenue');
  const [frequency, setFrequency] = useState<Frequency>('annual');
  const [view, setView] = useState<ViewMode>('combo');
  const [selected, setSelected] = useState<FinancialPeriod | null>(null);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    period: FinancialPeriod;
  } | null>(null);

  const periods = frequency === 'annual' ? financials.annual : financials.quarterly;
  const activeMetric = METRIC_OPTIONS.find((item) => item.id === metric)!;

  const growthLabel = frequency === 'annual' ? 'YoY' : 'QoQ';

  return (
    <div className="financials-panel">
      <div className="chart-toolbar">
        <div className="segmented" role="group" aria-label="Reporting frequency">
          <button type="button" aria-pressed={frequency === 'annual'} onClick={() => { setFrequency('annual'); setSelected(null); }}>Annual</button>
          <button type="button" aria-pressed={frequency === 'quarterly'} onClick={() => { setFrequency('quarterly'); setSelected(null); }}>Quarterly</button>
        </div>
        <div className="segmented" role="group" aria-label="Financial view">
          <button type="button" aria-pressed={view === 'combo'} onClick={() => setView('combo')}>Bars + margin</button>
          <button type="button" aria-pressed={view === 'spider'} onClick={() => setView('spider')}>Spider</button>
        </div>
        {view === 'combo' ? (
          <div className="segmented" role="group" aria-label="Financial chart metric">
            {METRIC_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                title={option.help}
                aria-pressed={metric === option.id}
                onClick={() => setMetric(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {view === 'combo' ? (
        <FinancialComboChart
          periods={periods}
          metric={metric}
          currency={financials.currency}
          metricLabel={activeMetric.label}
          selectedPeriod={selected?.period ?? null}
          onHover={setHover}
          onSelect={setSelected}
        />
      ) : (
        <FinancialSpiderChart periods={periods} onSelect={setSelected} />
      )}

      {hover ? (
        <div className="fin-tooltip" style={{ left: hover.x, top: hover.y }} role="tooltip">
          <p className="fin-tooltip-period">{hover.period.period}</p>
          <p><strong>{activeMetric.label}:</strong> {metric === 'eps' ? formatNumber(hover.period[metric], 2) : formatDollars(hover.period[metric])}</p>
          <p><strong>Op. margin:</strong> {formatPercent(hover.period.operatingMargin, 1, false)}</p>
          <p><strong>Op. profit:</strong> {formatDollars(hover.period.operatingIncome)}</p>
          {(() => {
            const index = periods.findIndex((item) => item.period === hover.period.period);
            const prior = index > 0 ? periods[index - 1] : undefined;
            const growth = growthRate(prior?.[metric] as number | undefined, hover.period[metric] as number);
            return (
              <p>
                <strong>{growthLabel}:</strong> {formatGrowth(growth)}
              </p>
            );
          })()}
          <p className="muted">Click for a fuller breakdown.</p>
        </div>
      ) : null}

      {selected ? (
        <aside className="fin-detail-card" aria-live="polite">
          <div className="dialog-heading">
            <h3>{selected.period} breakdown</h3>
            <button type="button" className="text-button" onClick={() => setSelected(null)}>Close</button>
          </div>
          <PeriodBreakdown period={selected} periods={periods} metric={metric} />
        </aside>
      ) : null}

      <div className="table-scroll">
        <table className="data-table financials-table">
          <caption className="sr-only">{frequency === 'annual' ? 'Annual' : 'Quarterly'} financial summary</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Revenue</th>
              <th scope="col">Rev {growthLabel}</th>
              <th scope="col">Net income</th>
              <th scope="col">NI {growthLabel}</th>
              <th scope="col">EPS</th>
              <th scope="col">EPS {growthLabel}</th>
              <th scope="col">Gross margin</th>
              <th scope="col">Op. margin</th>
              <th scope="col">Op. profit</th>
              <th scope="col">Free cash flow</th>
              <th scope="col">FCF {growthLabel}</th>
            </tr>
          </thead>
          <tbody>
            {[...periods].reverse().map((row, reverseIndex) => {
              const index = periods.length - 1 - reverseIndex;
              const prior = index > 0 ? periods[index - 1] : undefined;
              const revGrowth = growthRate(prior?.revenue, row.revenue);
              const niGrowth = growthRate(prior?.netIncome, row.netIncome);
              const epsGrowth = growthRate(prior?.eps, row.eps);
              const fcfGrowth = growthRate(prior?.freeCashFlow, row.freeCashFlow);
              return (
                <tr
                  key={row.period}
                  className={selected?.period === row.period ? 'is-selected' : undefined}
                  onClick={() => setSelected(row)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelected(row);
                    }
                  }}
                  tabIndex={0}
                  title="Click for period breakdown"
                >
                  <th scope="row">{row.period}</th>
                  <td className="num">{formatDollars(row.revenue)}</td>
                  <td className={`num ${signedClassNullable(revGrowth)}`}>{formatGrowth(revGrowth)}</td>
                  <td className={`num ${signedClass(row.netIncome)}`}>{formatDollars(row.netIncome)}</td>
                  <td className={`num ${signedClassNullable(niGrowth)}`}>{formatGrowth(niGrowth)}</td>
                  <td className={`num ${signedClass(row.eps)}`}>{formatNumber(row.eps, 2)}</td>
                  <td className={`num ${signedClassNullable(epsGrowth)}`}>{formatGrowth(epsGrowth)}</td>
                  <td className="num">{formatPercent(row.grossMargin, 1, false)}</td>
                  <td className={`num ${signedClass(row.operatingMargin)}`}>{formatPercent(row.operatingMargin, 1, false)}</td>
                  <td className={`num ${signedClass(row.operatingIncome)}`}>{formatDollars(row.operatingIncome)}</td>
                  <td className={`num ${signedClass(row.freeCashFlow)}`}>{formatDollars(row.freeCashFlow)}</td>
                  <td className={`num ${signedClassNullable(fcfGrowth)}`}>{formatGrowth(fcfGrowth)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="provenance">Source: {financials.provenance}</p>
    </div>
  );
}

function PeriodBreakdown({
  period,
  periods,
  metric,
}: {
  period: FinancialPeriod;
  periods: FinancialPeriod[];
  metric: ChartMetric;
}) {
  const index = periods.findIndex((item) => item.period === period.period);
  const prior = index > 0 ? periods[index - 1] : undefined;
  const metricDelta = prior && typeof prior[metric] === 'number'
    ? ((period[metric] as number) / (prior[metric] as number) - 1) * 100
    : null;
  const marginDelta = prior ? period.operatingMargin - prior.operatingMargin : null;
  const fcfConversion = period.netIncome !== 0 ? (period.freeCashFlow / period.netIncome) * 100 : null;

  return (
    <div className="fin-breakdown">
      <dl className="fin-breakdown-grid">
        <div><dt>Revenue</dt><dd className="num">{formatDollars(period.revenue)}</dd></div>
        <div><dt>Net income</dt><dd className={`num ${signedClass(period.netIncome)}`}>{formatDollars(period.netIncome)}</dd></div>
        <div><dt>EPS</dt><dd className={`num ${signedClass(period.eps)}`}>{formatNumber(period.eps, 2)}</dd></div>
        <div><dt>Gross margin</dt><dd className="num">{formatPercent(period.grossMargin, 1, false)}</dd></div>
        <div><dt>Operating margin</dt><dd className={`num ${signedClass(period.operatingMargin)}`}>{formatPercent(period.operatingMargin, 1, false)}</dd></div>
        <div><dt>Operating profit</dt><dd className={`num ${signedClass(period.operatingIncome)}`}>{formatDollars(period.operatingIncome)}</dd></div>
        <div><dt>Free cash flow</dt><dd className={`num ${signedClass(period.freeCashFlow)}`}>{formatDollars(period.freeCashFlow)}</dd></div>
        <div><dt>FCF / net income</dt><dd className="num">{fcfConversion == null ? '—' : formatPercent(fcfConversion, 0, false)}</dd></div>
      </dl>
      <ul className="fin-insight-list">
        <li>
          Selected metric ({METRIC_OPTIONS.find((item) => item.id === metric)?.label}):{' '}
          {metric === 'eps' ? formatNumber(period[metric], 2) : formatDollars(period[metric])}
          {metricDelta == null ? '' : ` · ${formatPercent(metricDelta)} vs prior period`}.
        </li>
        <li>
          Operating margin {formatPercent(period.operatingMargin, 1, false)} equals operating profit{' '}
          {formatDollars(period.operatingIncome)}
          {marginDelta == null ? '.' : ` · ${formatPercent(marginDelta, 1)} pts vs prior.`}
        </li>
        <li>
          Cash conversion is {fcfConversion == null ? 'unavailable' : formatPercent(fcfConversion, 0, false)} of net income
          — useful when judging quality of earnings.
        </li>
      </ul>
    </div>
  );
}

function signedClass(value: number): string {
  if (value > 0) return 'signed-up';
  if (value < 0) return 'signed-down';
  return '';
}

function signedClassNullable(value: number | null): string {
  if (value == null) return '';
  return signedClass(value);
}

function growthRate(prior: number | undefined, current: number): number | null {
  if (prior == null || !Number.isFinite(prior) || prior === 0) return null;
  return ((current / prior) - 1) * 100;
}

function formatGrowth(value: number | null): string {
  return value == null ? '—' : formatPercent(value);
}

function FinancialComboChart({
  periods,
  metric,
  currency,
  metricLabel,
  selectedPeriod,
  onHover,
  onSelect,
}: {
  periods: FinancialPeriod[];
  metric: ChartMetric;
  currency: string;
  metricLabel: string;
  selectedPeriod: string | null;
  onHover: (value: { x: number; y: number; period: FinancialPeriod } | null) => void;
  onSelect: (period: FinancialPeriod) => void;
}) {
  const geometry = useMemo(() => {
    const width = 820;
    const height = 340;
    const pad = { top: 28, right: 72, bottom: 52, left: 64 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const values = periods.map((period) => period[metric]);
    const margins = periods.map((period) => period.operatingMargin);
    const minBar = Math.min(0, ...values);
    const maxBar = Math.max(...values, 0);
    const barSpan = maxBar - minBar || 1;
    const minMargin = Math.min(...margins, 0);
    // Extra headroom keeps margin labels away from the top axis title.
    const maxMargin = Math.max(...margins, 5) * 1.18;
    const marginSpan = maxMargin - minMargin || 1;
    const slot = innerW / Math.max(periods.length, 1);
    const barWidth = Math.min(periods.length > 8 ? 28 : 42, slot * 0.55);

    const yBar = (value: number) => pad.top + ((maxBar - value) / barSpan) * innerH;
    const yMargin = (value: number) => pad.top + ((maxMargin - value) / marginSpan) * innerH;

    const bars = periods.map((period, index) => {
      const value = period[metric];
      const x = pad.left + slot * index + (slot - barWidth) / 2;
      const y0 = yBar(0);
      const y1 = yBar(value);
      const top = Math.min(y0, y1);
      const height = Math.max(2, Math.abs(y1 - y0));
      return {
        period,
        value,
        x,
        width: barWidth,
        y: top,
        height,
        // Center label inside the bar so it never collides with margin % markers.
        labelY: top + height / 2 + 4,
        positive: value >= 0,
        cx: x + barWidth / 2,
        growth: index > 0 ? growthRate(periods[index - 1]?.[metric] as number | undefined, value) : null,
      };
    });

    const linePoints = periods.map((period, index) => ({
      period,
      x: pad.left + slot * index + slot / 2,
      y: yMargin(period.operatingMargin),
      margin: period.operatingMargin,
      absolute: period.operatingIncome,
      // Place % labels to the right of the marker, clear of bar-center values.
      labelX: pad.left + slot * index + slot / 2 + Math.max(14, barWidth * 0.55),
    }));

    const linePath = linePoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(' ');

    const leftTicks = [maxBar, (maxBar + minBar) / 2, minBar].map((value) => ({
      value,
      y: yBar(value),
    }));
    const rightTicks = [maxMargin, (maxMargin + minMargin) / 2, minMargin].map((value) => ({
      value,
      y: yMargin(value),
    }));

    return {
      width,
      height,
      pad,
      bars,
      linePoints,
      linePath,
      leftTicks,
      rightTicks,
      zeroY: yBar(0),
    };
  }, [metric, periods]);

  const formatAxis = (value: number) => (metric === 'eps' ? formatNumber(value, 2) : formatDollars(value));

  return (
    <figure className="financial-chart-frame">
      <svg
        className="financial-chart"
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        role="img"
        aria-label={`${metricLabel} bars with operating-margin percent line`}
        onMouseLeave={() => onHover(null)}
      >
        {geometry.leftTicks.map((tick) => (
          <g key={`l-${tick.value}`}>
            <line className="grid-line" x1={geometry.pad.left} x2={geometry.width - geometry.pad.right} y1={tick.y} y2={tick.y} />
            <text className="axis-label" x={geometry.pad.left - 8} y={tick.y + 3} textAnchor="end">{formatAxis(tick.value)}</text>
          </g>
        ))}
        {geometry.rightTicks.map((tick) => (
          <text key={`r-${tick.value}`} className="axis-label axis-right" x={geometry.width - geometry.pad.right + 8} y={tick.y + 3} textAnchor="start">
            {formatPercent(tick.value, 1, false)}
          </text>
        ))}
        <text className="axis-title" x={geometry.pad.left} y={14}>{metricLabel} ({currency})</text>
        <text className="axis-title axis-right" x={geometry.width - geometry.pad.right} y={14} textAnchor="end">Op. margin %</text>

        <line className="grid-line strong" x1={geometry.pad.left} x2={geometry.width - geometry.pad.right} y1={geometry.zeroY} y2={geometry.zeroY} />

        {geometry.bars.map((bar) => (
          <g
            key={bar.period.period}
            className={`fin-bar-group ${selectedPeriod === bar.period.period ? 'is-selected' : ''}`}
            style={{ cursor: 'pointer' }}
            onMouseMove={(event) => {
              const bounds = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
              onHover({
                x: event.clientX - bounds.left + 12,
                y: event.clientY - bounds.top + 12,
                period: bar.period,
              });
            }}
            onClick={() => onSelect(bar.period)}
          >
            <rect
              className={bar.positive ? 'fin-bar up' : 'fin-bar down'}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={4}
            />
            <text className="bar-value in-bar" x={bar.cx} y={bar.labelY} textAnchor="middle">
              {formatAxis(bar.value)}
            </text>
            <text className="axis-label" x={bar.cx} y={geometry.height - 24} textAnchor="middle">
              {bar.period.period.replace('FY', '').replace(' 20', " '")}
            </text>
            {bar.growth != null ? (
              <text className={`growth-label ${bar.growth >= 0 ? 'up' : 'down'}`} x={bar.cx} y={geometry.height - 8} textAnchor="middle">
                {formatGrowth(bar.growth)}
              </text>
            ) : null}
          </g>
        ))}

        <path className="fin-line" d={geometry.linePath} fill="none" />
        {geometry.linePoints.map((point) => (
          <g
            key={`line-${point.period.period}`}
            style={{ cursor: 'pointer' }}
            onMouseMove={(event) => {
              const bounds = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
              onHover({
                x: event.clientX - bounds.left + 12,
                y: event.clientY - bounds.top + 12,
                period: point.period,
              });
            }}
            onClick={() => onSelect(point.period)}
          >
            <circle className="fin-line-dot" cx={point.x} cy={point.y} r={4} />
            <text className="line-value" x={point.labelX} y={point.y + 4} textAnchor="start">
              {formatPercent(point.margin, 1, false)}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="muted fin-caption">
        Bars use the left scale. Operating margin (%) uses the right scale; hover also shows absolute operating profit.
        Growth under each period is YoY for annual and QoQ for quarterly. Click a bar, point, or table row for period detail.
      </figcaption>
      <ul className="chart-legend">
        <li><span className="swatch fin-bar-swatch" aria-hidden="true" /> {metricLabel}</li>
        <li><span className="swatch fin-line-swatch" aria-hidden="true" /> Operating margin %</li>
      </ul>
    </figure>
  );
}

function FinancialSpiderChart({
  periods,
  onSelect,
}: {
  periods: FinancialPeriod[];
  onSelect: (period: FinancialPeriod) => void;
}) {
  const latest = periods[periods.length - 1];
  const prior = periods.length > 1 ? periods[periods.length - 2] : undefined;
  if (!latest) return null;

  const revGrowth = prior?.revenue ? ((latest.revenue / prior.revenue) - 1) * 100 : 0;
  const epsGrowth = prior?.eps ? ((latest.eps / Math.max(Math.abs(prior.eps), 0.01)) - 1) * 100 : 0;
  const fcfConv = latest.netIncome !== 0 ? (latest.freeCashFlow / latest.netIncome) * 100 : 0;

  const axes = [
    { key: 'rev', label: 'Rev growth', raw: revGrowth, score: clampScore((revGrowth + 10) / 30 * 100) },
    { key: 'gross', label: 'Gross margin', raw: latest.grossMargin, score: clampScore(latest.grossMargin) },
    { key: 'op', label: 'Op margin', raw: latest.operatingMargin, score: clampScore(latest.operatingMargin * 2.2) },
    { key: 'fcf', label: 'FCF conversion', raw: fcfConv, score: clampScore(fcfConv) },
    { key: 'eps', label: 'EPS growth', raw: epsGrowth, score: clampScore((epsGrowth + 10) / 30 * 100) },
    { key: 'ni', label: 'Net margin', raw: latest.netIncome / latest.revenue * 100, score: clampScore((latest.netIncome / latest.revenue) * 100 * 2.5) },
  ];

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 110;
  const points = axes.map((axis, index) => {
    const angle = (-Math.PI / 2) + (index / axes.length) * Math.PI * 2;
    const r = (axis.score / 100) * radius;
    return {
      ...axis,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      lx: cx + Math.cos(angle) * (radius + 22),
      ly: cy + Math.sin(angle) * (radius + 22),
      angle,
    };
  });
  const polygon = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

  return (
    <figure className="financial-chart-frame spider-frame">
      <svg className="financial-chart spider-chart" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Spider chart for ${latest.period}`}>
        {[0.25, 0.5, 0.75, 1].map((ring) => (
          <circle key={ring} className="spider-ring" cx={cx} cy={cy} r={radius * ring} />
        ))}
        {points.map((point) => (
          <line key={point.key} className="spider-axis" x1={cx} y1={cy} x2={cx + Math.cos(point.angle) * radius} y2={cy + Math.sin(point.angle) * radius} />
        ))}
        <polygon className="spider-poly" points={polygon} />
        {points.map((point) => (
          <g key={point.key}>
            <circle className="fin-line-dot" cx={point.x} cy={point.y} r={3.5} />
            <text className="axis-label" x={point.lx} y={point.ly} textAnchor="middle">{point.label}</text>
          </g>
        ))}
      </svg>
      <div className="spider-side">
        <p className="takeaway">Latest period profile · {latest.period}</p>
        <ul className="spider-metrics">
          {axes.map((axis) => (
            <li key={axis.key}>
              <span>{axis.label}</span>
              <strong className="num">
                {axis.key.includes('margin') || axis.key === 'fcf' || axis.key === 'ni' || axis.key === 'op' || axis.key === 'gross'
                  ? formatPercent(axis.raw, 1, false)
                  : formatPercent(axis.raw)}
              </strong>
            </li>
          ))}
        </ul>
        <button type="button" className="text-button" onClick={() => onSelect(latest)}>
          Open {latest.period} details
        </button>
      </div>
    </figure>
  );
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(5, Math.min(100, value));
}
