import type { CapTier, RelativeStrengthState, ScreenerRow, SectorId, TrendAlignment } from '@/domain/types';
import { SECTORS } from '@/domain/config';

const SECTOR_IDS = new Set(SECTORS.map((sector) => sector.id));
const CAP_TIERS = new Set<CapTier>(['mega', 'large']);
const TRENDS = new Set<TrendAlignment>(['STRONG_UPTREND', 'UPTREND', 'MIXED', 'DOWNTREND', 'STRONG_DOWNTREND', 'INSUFFICIENT']);
const RS_STATES = new Set<RelativeStrengthState>([
  'LEADING_MARKET_AND_SECTOR',
  'LEADING_MARKET',
  'LEADING_SECTOR',
  'IN_LINE',
  'LAGGING',
  'INSUFFICIENT',
]);

export interface ScreenerFilters {
  query: string;
  sector: SectorId | 'all';
  capTier: CapTier | 'all';
  trend: TrendAlignment | 'all';
  rs: RelativeStrengthState | 'all';
  rsiMin: number;
  rsiMax: number;
  atrMin: number;
  atrMax: number;
  rvolMin: number | null;
  maxDistanceFromHigh: number | null;
}

export const DEFAULT_SCREENER_FILTERS: ScreenerFilters = {
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

function numberFrom(value: string | null, fallback: number): number {
  if (value == null || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function filtersFromParams(params: URLSearchParams): ScreenerFilters {
  const sector = params.get('sector');
  const cap = params.get('cap');
  const trend = params.get('trend');
  const rs = params.get('rs');
  const rvol = params.get('rvol');
  const near = params.get('near');
  return {
    query: params.get('q') ?? '',
    sector: sector && SECTOR_IDS.has(sector as SectorId) ? sector as SectorId : 'all',
    capTier: cap && CAP_TIERS.has(cap as CapTier) ? cap as CapTier : 'all',
    trend: trend && TRENDS.has(trend as TrendAlignment) ? trend as TrendAlignment : 'all',
    rs: rs && RS_STATES.has(rs as RelativeStrengthState) ? rs as RelativeStrengthState : 'all',
    rsiMin: numberFrom(params.get('rsiMin'), 0),
    rsiMax: numberFrom(params.get('rsiMax'), 100),
    atrMin: numberFrom(params.get('atrMin'), 0),
    atrMax: numberFrom(params.get('atrMax'), 100),
    rvolMin: rvol == null || rvol === '' ? null : numberFrom(rvol, 0),
    maxDistanceFromHigh: near == null || near === '' ? null : numberFrom(near, 0),
  };
}

export function paramsFromFilters(filters: ScreenerFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.sector !== 'all') params.set('sector', filters.sector);
  if (filters.capTier !== 'all') params.set('cap', filters.capTier);
  if (filters.trend !== 'all') params.set('trend', filters.trend);
  if (filters.rs !== 'all') params.set('rs', filters.rs);
  if (filters.rsiMin !== 0) params.set('rsiMin', String(filters.rsiMin));
  if (filters.rsiMax !== 100) params.set('rsiMax', String(filters.rsiMax));
  if (filters.atrMin !== 0) params.set('atrMin', String(filters.atrMin));
  if (filters.atrMax !== 100) params.set('atrMax', String(filters.atrMax));
  if (filters.rvolMin != null) params.set('rvol', String(filters.rvolMin));
  if (filters.maxDistanceFromHigh != null) params.set('near', String(filters.maxDistanceFromHigh));
  return params;
}

export function filtersAreDefault(filters: ScreenerFilters): boolean {
  return paramsFromFilters(filters).toString() === '';
}

export function filterScreenerRows(rows: ScreenerRow[], filters: ScreenerFilters): ScreenerRow[] {
  const query = filters.query.trim().toLowerCase();
  const rsiLow = Math.min(filters.rsiMin, filters.rsiMax);
  const rsiHigh = Math.max(filters.rsiMin, filters.rsiMax);
  const atrLow = Math.min(filters.atrMin, filters.atrMax);
  const atrHigh = Math.max(filters.atrMin, filters.atrMax);
  const atrOpen = atrLow <= 0 && atrHigh >= 100;

  return rows.filter((row) => {
    if (query && !`${row.ticker} ${row.company}`.toLowerCase().includes(query)) return false;
    if (filters.sector !== 'all' && row.sectorId !== filters.sector) return false;
    if (filters.capTier !== 'all' && row.capTier !== filters.capTier) return false;
    if (filters.trend !== 'all' && row.trendState !== filters.trend) return false;
    if (filters.rs !== 'all' && row.rsState !== filters.rs) return false;
    if (row.rsi < rsiLow || row.rsi > rsiHigh) return false;
    if (!atrOpen && (row.atrPercentile == null || row.atrPercentile < atrLow || row.atrPercentile > atrHigh)) return false;
    if (filters.rvolMin != null && row.rvol < filters.rvolMin) return false;
    if (filters.maxDistanceFromHigh != null) {
      if (row.distance52wHigh == null || row.distance52wHigh < -filters.maxDistanceFromHigh) return false;
    }
    return true;
  });
}
