import { useMemo, useState } from 'react';
import { formatAsOf, formatPercent, formatPrice, formatVolume } from '@/domain/metrics/format';
import type { ChartRange, OHLCVPoint } from '@/domain/types';

const RANGES: Array<{ id: ChartRange; label: string; sessions: number }> = [
  { id: '3M', label: '3M', sessions: 63 },
  { id: '6M', label: '6M', sessions: 126 },
  { id: '1Y', label: '1Y', sessions: 252 },
  { id: '2Y', label: '2Y', sessions: 520 },
];

export default function PriceChart({ points, ticker }: { points: OHLCVPoint[]; ticker: string }) {
  const [range, setRange] = useState<ChartRange>('1Y');
  const [overlays, setOverlays] = useState({ sma20: false, sma50: true, sma200: false });
  const [hover, setHover] = useState<number | null>(null);

  const visible = useMemo(() => {
    const sessions = RANGES.find((item) => item.id === range)?.sessions ?? points.length;
    return points.slice(-sessions);
  }, [points, range]);

  if (visible.length < 2) {
    return <p className="chart-empty">Not enough prices to draw a chart.</p>;
  }

  const width = 800;
  const height = 420;
  const padLeft = 56;
  const padRight = 12;
  const priceTop = 16;
  const priceBottom = 268;
  const volumeTop = 296;
  const volumeBottom = 392;
  const values: number[] = [];
  for (const point of visible) {
    values.push(point.low, point.high);
    if (overlays.sma20 && point.sma20 != null) values.push(point.sma20);
    if (overlays.sma50 && point.sma50 != null) values.push(point.sma50);
    if (overlays.sma200 && point.sma200 != null) values.push(point.sma200);
  }
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || 1;
  const min = rawMin - span * 0.06;
  const max = rawMax + span * 0.06;
  const plotWidth = width - padLeft - padRight;
  const yFor = (price: number) => priceBottom - ((price - min) / (max - min)) * (priceBottom - priceTop);
  const xFor = (index: number) => padLeft + ((index + 0.5) / visible.length) * plotWidth;
  const slot = plotWidth / visible.length;
  const bodyWidth = Math.max(1.4, slot * 0.62);
  const maxVolume = Math.max(...visible.map((point) => point.volume), 1);
  const first = visible[0];
  const last = visible[visible.length - 1];
  if (!first || !last) return null;
  const periodChange = first.close === 0 ? 0 : (last.close / first.close - 1) * 100;
  const periodHigh = Math.max(...visible.map((point) => point.high));
  const periodLow = Math.min(...visible.map((point) => point.low));
  const active = hover == null ? last : visible[hover] ?? last;
  const summary = `${ticker} daily candles from ${formatAsOf(first.date)} to ${formatAsOf(last.date)}. Close moved from ${formatPrice(first.close)} to ${formatPrice(last.close)} (${formatPercent(periodChange)}). Period high ${formatPrice(periodHigh)}, period low ${formatPrice(periodLow)}. Latest volume ${formatVolume(last.volume)}.`;

  function linePath(key: 'sma20' | 'sma50' | 'sma200') {
    let path = '';
    visible.forEach((point, index) => {
      const value = point[key];
      if (value == null) return;
      path += `${path ? 'L' : 'M'}${xFor(index).toFixed(2)} ${yFor(value).toFixed(2)} `;
    });
    return path;
  }

  return (
    <figure className="chart-frame">
      <figcaption id={`${ticker}-chart-summary`} className="chart-summary">
        {summary}
        {hover != null ? (
          <span className="chart-readout">
            {' '}Focus {formatAsOf(active.date)} · O {formatPrice(active.open)} H {formatPrice(active.high)} L {formatPrice(active.low)} C {formatPrice(active.close)} · Vol {formatVolume(active.volume)}
          </span>
        ) : null}
      </figcaption>
      <div className="chart-toolbar">
        <div className="segmented" role="group" aria-label="Chart range">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={range === item.id}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Moving averages">
          {([
            ['sma20', 'SMA 20'],
            ['sma50', 'SMA 50'],
            ['sma200', 'SMA 200'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={overlays[key]}
              onClick={() => setOverlays((current) => ({ ...current, [key]: !current[key] }))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <svg
        className="price-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${ticker}-chart-summary`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const relative = (event.clientX - rect.left) / rect.width;
          const index = Math.round(relative * visible.length - 0.5);
          setHover(Math.min(visible.length - 1, Math.max(0, index)));
        }}
      >
        <title>{ticker} price and volume</title>
        {[0, 0.5, 1].map((step) => {
          const price = min + (max - min) * (1 - step);
          const y = yFor(price);
          return (
            <g key={step}>
              <line className="grid-line" x1={padLeft} x2={width - padRight} y1={y} y2={y} />
              <text className="axis-label" x={padLeft - 8} y={y + 4} textAnchor="end">{formatPrice(price)}</text>
            </g>
          );
        })}
        {visible.map((point, index) => {
          const up = point.close >= point.open;
          const x = xFor(index);
          const highY = yFor(point.high);
          const lowY = yFor(point.low);
          const openY = yFor(point.open);
          const closeY = yFor(point.close);
          const top = Math.min(openY, closeY);
          const barHeight = Math.max(1, Math.abs(closeY - openY));
          const volumeHeight = (point.volume / maxVolume) * (volumeBottom - volumeTop);
          return (
            <g key={point.date} className={up ? 'candle-up' : 'candle-down'}>
              <line x1={x} x2={x} y1={highY} y2={lowY} />
              <rect x={x - bodyWidth / 2} y={top} width={bodyWidth} height={barHeight} />
              <rect
                className="volume-bar"
                x={x - bodyWidth / 2}
                y={volumeBottom - volumeHeight}
                width={bodyWidth}
                height={volumeHeight}
              />
            </g>
          );
        })}
        {overlays.sma20 ? <path className="sma sma-20" d={linePath('sma20')} /> : null}
        {overlays.sma50 ? <path className="sma sma-50" d={linePath('sma50')} /> : null}
        {overlays.sma200 ? <path className="sma sma-200" d={linePath('sma200')} /> : null}
        <text className="axis-label" x={padLeft} y={288}>Volume</text>
      </svg>
      <ul className="chart-legend">
        <li><span className="swatch candle-up-swatch" /> Up day, hollow</li>
        <li><span className="swatch candle-down-swatch" /> Down day, filled</li>
        {overlays.sma50 ? <li><span className="swatch sma50-swatch" /> SMA 50</li> : null}
        {overlays.sma20 ? <li><span className="swatch sma20-swatch" /> SMA 20</li> : null}
        {overlays.sma200 ? <li><span className="swatch sma200-swatch" /> SMA 200</li> : null}
      </ul>
    </figure>
  );
}
