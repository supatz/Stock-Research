import type { OHLCVPoint, TrendAlignment } from '@/domain/types';
import { alignmentReading } from '@/domain/metrics/states';
import { roundTo } from '@/domain/metrics/format';

export interface SeriesRequest {
  ticker: string;
  endPrice: number;
  endDate: string;
  sessions: number;
  growth: number;
  kind: 'geometric' | 'peak';
  peak?: number;
  wave: number;
  bend: number;
  rangeFrac: number;
  pinNearHigh: boolean;
  averageVolume: number;
  rvol: number;
}

export interface MacdReading {
  macd: number;
  signal: number;
  histogram: number;
  direction: 'rising' | 'falling' | 'flat';
  aboveSignal: boolean;
  aboveZero: boolean;
}

export interface ReturnSet {
  d1: number | null;
  d5: number | null;
  m1: number | null;
  m3: number | null;
  m6: number | null;
  ytd: number | null;
  y1: number | null;
}

export interface SeriesStats {
  points: OHLCVPoint[];
  sessions: number;
  last: number;
  previous: number;
  change: number;
  changePct: number;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  dist20: number | null;
  dist50: number | null;
  dist200: number | null;
  slope20: number | null;
  slope50: number | null;
  slope200: number | null;
  alignment: TrendAlignment;
  returns: ReturnSet;
  distHigh: number | null;
  distLow: number | null;
  drawdown: number | null;
  maxDrawdown1y: number | null;
  atrPct: number | null;
  rv20: number | null;
  rv60: number | null;
  bbWidth: number | null;
  roc20: number | null;
  roc63: number | null;
  macd: MacdReading | null;
  high20: boolean | null;
  low20: boolean | null;
  high55: boolean | null;
  low55: boolean | null;
  windowComplete: boolean;
  averageVolume: number;
  lastVolume: number;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function tradingDaysEnding(endISO: string, count: number): string[] {
  const [year, month, day] = endISO.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  const days: string[] = [];
  while (days.length < count) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  days.reverse();
  if (days[days.length - 1] !== endISO) {
    throw new Error(`End date ${endISO} is not a weekday`);
  }
  return days;
}

function smaAt(values: number[], index: number, period: number): number | null {
  if (index < period - 1) return null;
  let sum = 0;
  for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
    sum += values[cursor] ?? 0;
  }
  return sum / period;
}

function returnOver(closes: number[], sessions: number): number | null {
  if (closes.length <= sessions) return null;
  const last = closes[closes.length - 1];
  const base = closes[closes.length - 1 - sessions];
  if (last == null || base == null || base === 0) return null;
  return (last / base - 1) * 100;
}

function emaSeries(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const output: number[] = [];
  let previous = values[0] ?? 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? previous;
    previous = index === 0 ? value : value * k + previous * (1 - k);
    output.push(previous);
  }
  return output;
}

function macdReading(closes: number[]): MacdReading | null {
  if (closes.length < 40) return null;
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const line = ema12.map((value, index) => value - (ema26[index] ?? 0));
  const signal = emaSeries(line, 9);
  const last = line.length - 1;
  const macd = line[last] ?? 0;
  const signalValue = signal[last] ?? 0;
  const histogram = macd - signalValue;
  const priorIndex = Math.max(0, last - 5);
  const priorHistogram = (line[priorIndex] ?? 0) - (signal[priorIndex] ?? 0);
  const delta = histogram - priorHistogram;
  const direction = delta > 0.0000001 ? 'rising' : delta < -0.0000001 ? 'falling' : 'flat';
  return {
    macd,
    signal: signalValue,
    histogram,
    direction,
    aboveSignal: macd >= signalValue,
    aboveZero: macd >= 0,
  };
}

function realizedVol(closes: number[], window: number): number | null {
  if (closes.length < window + 1) return null;
  const returns: number[] = [];
  for (let index = closes.length - window; index < closes.length; index += 1) {
    const current = closes[index];
    const previous = closes[index - 1];
    if (current == null || previous == null || previous <= 0 || current <= 0) continue;
    returns.push(Math.log(current / previous));
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function bollingerWidth(closes: number[], period = 20): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mean = slice.reduce((sum, value) => sum + value, 0) / period;
  if (mean === 0) return null;
  const variance = slice.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;
  return (4 * Math.sqrt(variance) / mean) * 100;
}

function averageTrueRangePct(points: OHLCVPoint[], period = 14): number | null {
  if (points.length < period + 1) return null;
  const trueRanges: number[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    if (!current || !previous) continue;
    trueRanges.push(Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close),
    ));
  }
  if (trueRanges.length < period) return null;
  let atr = 0;
  for (let index = 0; index < period; index += 1) atr += trueRanges[index] ?? 0;
  atr /= period;
  for (let index = period; index < trueRanges.length; index += 1) {
    atr = (atr * (period - 1) + (trueRanges[index] ?? 0)) / period;
  }
  const last = points[points.length - 1]?.close;
  if (!last) return null;
  return (atr / last) * 100;
}

function maxDrawdown(closes: number[]): number | null {
  if (closes.length === 0) return null;
  let peak = closes[0] ?? 0;
  let worst = 0;
  for (const close of closes) {
    if (close > peak) peak = close;
    if (peak > 0) worst = Math.min(worst, close / peak - 1);
  }
  return worst * 100;
}

function ytdReturn(dates: string[], closes: number[]): number | null {
  const firstThisYear = dates.findIndex((date) => date >= '2026-01-01');
  if (firstThisYear <= 0) return null;
  const base = closes[firstThisYear - 1];
  const last = closes[closes.length - 1];
  if (base == null || last == null || base === 0) return null;
  return (last / base - 1) * 100;
}

function slope(closes: number[], period: number): number | null {
  const endIndex = closes.length - 1;
  const end = smaAt(closes, endIndex, period);
  const start = smaAt(closes, endIndex - 10, period);
  if (end == null || start == null || start === 0) return null;
  return (end / start - 1) * 100;
}

function windowExtreme(points: OHLCVPoint[], sessions: number, sideName: 'high' | 'low'): boolean | null {
  if (points.length < Math.min(sessions, 5)) return null;
  const slice = points.slice(-Math.min(sessions, points.length));
  const last = slice[slice.length - 1];
  if (!last) return null;
  if (sideName === 'high') {
    const highest = Math.max(...slice.map((point) => point.high));
    return last.high >= highest - 0.0001;
  }
  const lowest = Math.min(...slice.map((point) => point.low));
  return last.low <= lowest + 0.0001;
}

export function buildSeries(request: SeriesRequest): SeriesStats {
  const dates = tradingDaysEnding(request.endDate, request.sessions);
  const count = dates.length;
  const phase = (hashString(request.ticker) % 628) / 100;
  const levels: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const progress = count === 1 ? 1 : index / (count - 1);
    let level: number;
    if (request.kind === 'peak') {
      const peakAt = 0.72;
      const peak = request.peak ?? request.growth * 1.25;
      if (progress <= peakAt) {
        level = peak ** (progress / peakAt);
      } else {
        level = peak * (request.growth / peak) ** ((progress - peakAt) / (1 - peakAt));
      }
    } else {
      level = request.growth ** progress;
      if (request.bend !== 0 && progress > 0.9) {
        const bendProgress = (progress - 0.9) / 0.1;
        level *= 1 + request.bend * bendProgress;
      }
    }
    level *= 1 + request.wave * Math.sin(index / 7.5 + phase);
    levels.push(Math.max(level, 0.05));
  }
  const lastLevel = levels[levels.length - 1] || 1;
  const scale = request.endPrice / lastLevel;
  const closes = levels.map((level) => level * scale);
  if (request.pinNearHigh) {
    const cap = (closes[closes.length - 1] ?? request.endPrice) / 0.997;
    for (let index = 0; index < closes.length - 1; index += 1) {
      if ((closes[index] ?? 0) > cap) closes[index] = cap;
    }
  }

  const points: OHLCVPoint[] = closes.map((close, index) => {
    const previous = index === 0 ? close : (closes[index - 1] ?? close);
    const open = index === 0 ? close : previous + (close - previous) * 0.4;
    const base = Math.max(open, close, 0.01);
    let high = Math.max(open, close) + base * request.rangeFrac * 0.55;
    let low = Math.min(open, close) - base * request.rangeFrac * 0.45;
    if (request.pinNearHigh && index < closes.length - 1) {
      const cap = (closes[closes.length - 1] ?? close) / 0.996;
      high = Math.min(high, Math.max(cap, close, open));
    }
    low = Math.max(0.01, Math.min(low, open, close));
    high = Math.max(high, open, close);
    const wobble = 0.82 + ((hashString(request.ticker) + index * 17) % 37) / 100;
    const volume = index === closes.length - 1
      ? Math.round(request.averageVolume * request.rvol)
      : Math.round(request.averageVolume * wobble);
    return {
      date: dates[index] ?? request.endDate,
      open: roundTo(open, 2),
      high: roundTo(high, 2),
      low: roundTo(low, 2),
      close: roundTo(close, 2),
      volume,
      sma20: null,
      sma50: null,
      sma200: null,
    };
  });

  const lastPoint = points[points.length - 1];
  if (lastPoint) {
    lastPoint.close = roundTo(request.endPrice, 2);
    lastPoint.high = Math.max(lastPoint.high, lastPoint.open, lastPoint.close);
    lastPoint.low = Math.min(lastPoint.low, lastPoint.open, lastPoint.close);
  }

  const roundedCloses = points.map((point) => point.close);
  points.forEach((point, index) => {
    point.sma20 = roundOrNull(smaAt(roundedCloses, index, 20));
    point.sma50 = roundOrNull(smaAt(roundedCloses, index, 50));
    point.sma200 = roundOrNull(smaAt(roundedCloses, index, 200));
  });

  const last = roundedCloses[roundedCloses.length - 1] ?? request.endPrice;
  const previous = roundedCloses[roundedCloses.length - 2] ?? last;
  const sma20 = smaAt(roundedCloses, roundedCloses.length - 1, 20);
  const sma50 = smaAt(roundedCloses, roundedCloses.length - 1, 50);
  const sma200 = smaAt(roundedCloses, roundedCloses.length - 1, 200);
  const alignment = alignmentReading(last, sma20, sma50, sma200).state;
  const yearWindow = points.slice(-Math.min(252, points.length));
  const high52 = Math.max(...yearWindow.map((point) => point.high));
  const low52 = Math.min(...yearWindow.map((point) => point.low));
  const peak = Math.max(...roundedCloses);

  return {
    points,
    sessions: points.length,
    last,
    previous,
    change: last - previous,
    changePct: previous === 0 ? 0 : (last / previous - 1) * 100,
    sma20,
    sma50,
    sma200,
    dist20: percentDistance(last, sma20),
    dist50: percentDistance(last, sma50),
    dist200: percentDistance(last, sma200),
    slope20: slope(roundedCloses, 20),
    slope50: slope(roundedCloses, 50),
    slope200: slope(roundedCloses, 200),
    alignment,
    returns: {
      d1: returnOver(roundedCloses, 1),
      d5: returnOver(roundedCloses, 5),
      m1: returnOver(roundedCloses, 21),
      m3: returnOver(roundedCloses, 63),
      m6: returnOver(roundedCloses, 126),
      ytd: ytdReturn(dates, roundedCloses),
      y1: returnOver(roundedCloses, 252),
    },
    distHigh: high52 > 0 ? (last / high52 - 1) * 100 : null,
    distLow: low52 > 0 ? (last / low52 - 1) * 100 : null,
    drawdown: peak > 0 ? (last / peak - 1) * 100 : null,
    maxDrawdown1y: maxDrawdown(roundedCloses.slice(-Math.min(252, roundedCloses.length))),
    atrPct: averageTrueRangePct(points),
    rv20: realizedVol(roundedCloses, 20),
    rv60: realizedVol(roundedCloses, 60),
    bbWidth: bollingerWidth(roundedCloses),
    roc20: returnOver(roundedCloses, 20),
    roc63: returnOver(roundedCloses, 63),
    macd: macdReading(roundedCloses),
    high20: windowExtreme(points, 20, 'high'),
    low20: windowExtreme(points, 20, 'low'),
    high55: windowExtreme(points, 55, 'high'),
    low55: windowExtreme(points, 55, 'low'),
    windowComplete: points.length >= 252,
    averageVolume: request.averageVolume,
    lastVolume: lastPoint?.volume ?? 0,
  };
}

function roundOrNull(value: number | null): number | null {
  return value == null ? null : roundTo(value, 2);
}

function percentDistance(price: number, average: number | null): number | null {
  if (average == null || average === 0) return null;
  return (price / average - 1) * 100;
}
