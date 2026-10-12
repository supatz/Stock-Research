import { describe, expect, it } from 'vitest';
import type { ScreenerRow } from '@/domain/types';
import { filterScreenerRows, type ScreenerFilters } from '@/features/screener/filters';

const base: ScreenerFilters = {
  query: '',
  sector: 'all',
  capTier: 'all',
  trend: 'all',
  rs: 'all',
  rsiMin: 0,
  rsiMax: 100,
  atrMin: 0,
  atrMax: 100,
  rvolMin: null,
  maxDistanceFromHigh: null,
};

function row(overrides: Partial<ScreenerRow>): ScreenerRow {
  return {
    ticker: 'AAA',
    company: 'Alpha',
    sectorId: 'information-technology',
    sector: 'Technology',
    capTier: 'mega',
    marketCap: 1,
    price: 10,
    dailyChangePct: 0,
    return1m: 1,
    rs6mVsSpy: 1,
    trendState: 'UPTREND',
    rsi: 55,
    adx: 20,
    atrPct: 1.5,
    atrPercentile: 40,
    rvol: 1,
    distance52wHigh: -8,
    rsState: 'IN_LINE',
    asOf: '2026-10-12',
    quality: 'good',
    ...overrides,
  };
}

const rows = [
  row({ ticker: 'AAPL', company: 'Apple', rsi: 72, atrPercentile: 40, rvol: 0.9, distance52wHigh: -1 }),
  row({
    ticker: 'NEE',
    company: 'NextEra Energy',
    sectorId: 'utilities',
    sector: 'Utilities',
    capTier: 'large',
    trendState: 'MIXED',
    rsState: 'LEADING_SECTOR',
    rsi: 42,
    atrPercentile: null,
    rvol: 0.78,
    distance52wHigh: -12,
  }),
];

describe('filterScreenerRows', () => {
  it('matches ticker or company text without case sensitivity', () => {
    expect(filterScreenerRows(rows, { ...base, query: 'apple' }).map((item) => item.ticker)).toEqual(['AAPL']);
  });

  it('filters sector, RSI, relative volume, and distance from the high', () => {
    expect(filterScreenerRows(rows, { ...base, sector: 'utilities' })).toHaveLength(1);
    expect(filterScreenerRows(rows, { ...base, rsiMin: 70 })).toHaveLength(1);
    expect(filterScreenerRows(rows, { ...base, rvolMin: 1.25 })).toHaveLength(0);
    expect(filterScreenerRows(rows, { ...base, maxDistanceFromHigh: 5 }).map((item) => item.ticker)).toEqual(['AAPL']);
  });

  it('drops missing ATR percentiles only when the percentile range is narrowed', () => {
    expect(filterScreenerRows(rows, base)).toHaveLength(2);
    expect(filterScreenerRows(rows, { ...base, atrMin: 30, atrMax: 90 }).map((item) => item.ticker)).toEqual(['AAPL']);
  });
});
