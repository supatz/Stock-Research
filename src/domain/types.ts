export type CapTier = 'mega' | 'large';

export type DataQualityStatus = 'good' | 'partial' | 'stale' | 'insufficient';

export type SectorId =
  | 'communication-services'
  | 'consumer-discretionary'
  | 'consumer-staples'
  | 'energy'
  | 'financials'
  | 'health-care'
  | 'industrials'
  | 'information-technology'
  | 'materials'
  | 'real-estate'
  | 'utilities';

export type ComparisonPolicy =
  | 'SELF_HISTORY'
  | 'SECTOR'
  | 'SECTOR_SIZE'
  | 'SIZE'
  | 'MARKET'
  | 'BENCHMARK_RELATIVE'
  | 'NONE';

export type InterpretationMode =
  | 'HIGHER_IS_STRONGER'
  | 'LOWER_IS_BETTER'
  | 'TARGET_RANGE'
  | 'EXTREME_CONTEXT'
  | 'CATEGORICAL'
  | 'TWO_SIDED_RISK';

export type TrendAlignment =
  | 'STRONG_UPTREND'
  | 'UPTREND'
  | 'MIXED'
  | 'DOWNTREND'
  | 'STRONG_DOWNTREND'
  | 'INSUFFICIENT';

export type RelativeStrengthState =
  | 'LEADING_MARKET_AND_SECTOR'
  | 'LEADING_MARKET'
  | 'LEADING_SECTOR'
  | 'IN_LINE'
  | 'LAGGING'
  | 'INSUFFICIENT';

export type ChartRange = '3M' | '6M' | '1Y' | '2Y';

export interface MetricHelp {
  metricId: string;
  title: string;
  plainEnglish: string;
  formula?: string;
  howToRead: string[];
  compareAgainst: string[];
  caveats: string[];
  example?: string;
}

export interface MetricDefinition {
  id: string;
  label: string;
  dimension: string;
  unit?: string;
  comparisonPolicy: ComparisonPolicy;
  interpretationMode: InterpretationMode;
  precision: number;
  help: MetricHelp;
}

export interface HistoricalComparison {
  percentile: number | null;
  sampleSize: number;
  lookbackDays: number;
  startDate?: string;
  message?: string;
}

export interface CrossSectionComparison {
  percentile: number | null;
  cohortLabel: string;
  sampleSize: number;
  fallbackLevel?: string;
  fallbackDetail?: string;
  message?: string;
}

export interface MetricObservation {
  metricId: string;
  asOf: string;
  rawValue: number | string | null;
  displayValue: string;
  unit?: string;
  historical?: HistoricalComparison;
  sectorRelative?: CrossSectionComparison;
  marketRelative?: CrossSectionComparison;
  interpretation: {
    mode: InterpretationMode;
    state: string;
    shortText: string;
  };
  dataQuality?: {
    status: DataQualityStatus;
    message?: string;
  };
  provenance: string;
}

export interface OHLCVPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
}

export interface StockSummary {
  ticker: string;
  company: string;
  market: 'US';
  timezone: 'America/New_York';
  currency: 'USD';
  exchange: 'NYSE' | 'NASDAQ';
  sectorId: SectorId;
  sector: string;
  industry: string;
  capTier: CapTier;
  marketCap: number;
  price: number;
  dailyChange: number;
  dailyChangePct: number;
  asOf: string;
  sectorBenchmark: string;
  trendState: TrendAlignment;
  rsState: RelativeStrengthState;
  rsi: number;
  adx: number;
  atrPct: number | null;
  atrPercentile: number | null;
  rvol: number;
  return1m: number | null;
  return6mVsSpy: number | null;
  distance52wHigh: number | null;
  quality: DataQualityStatus;
  qualityMessage?: string;
}

export interface MovingAverages {
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
}

export interface HorizonSet {
  m1: number | null;
  m3: number | null;
  m6: number | null;
  m12: number | null;
}

export interface PriceStructure {
  distHigh: number | null;
  distLow: number | null;
  high20: boolean | null;
  low20: boolean | null;
  high55: boolean | null;
  low55: boolean | null;
  breakout: 'confirmed' | 'price-only' | 'none' | null;
  drawdown: number | null;
  maxDrawdown1y: number | null;
  windowComplete: boolean;
}

export interface DimensionState {
  id: 'trend' | 'momentum' | 'relative-strength' | 'volatility' | 'volume' | 'market';
  label: string;
  state: string;
  shortText: string;
  primary: string;
  sectionId:
    | 'section.stock.trend'
    | 'section.stock.momentum'
    | 'section.stock.relative-strength'
    | 'section.stock.volatility'
    | 'section.stock.volume'
    | 'section.stock.market-context';
}

export interface StockDetail {
  summary: StockSummary;
  metrics: Record<string, MetricObservation>;
  dimensions: DimensionState[];
  takeaways: {
    performance: string;
    trend: string;
    momentum: string;
    relativeStrength: string;
    volatility: string;
    volume: string;
    structure: string;
    market: string;
  };
  movingAverages: MovingAverages;
  relativeStrength: {
    state: RelativeStrengthState;
    vsSpy: HorizonSet;
    vsSector: HorizonSet;
    sectorEtf: string;
  };
  structure: PriceStructure;
  sessions: number;
}

export interface ScreenerRow {
  ticker: string;
  company: string;
  sectorId: SectorId;
  sector: string;
  capTier: CapTier;
  marketCap: number;
  price: number;
  dailyChangePct: number;
  return1m: number | null;
  rs6mVsSpy: number | null;
  trendState: TrendAlignment;
  rsi: number;
  adx: number;
  atrPct: number | null;
  atrPercentile: number | null;
  rvol: number;
  distance52wHigh: number | null;
  rsState: RelativeStrengthState;
  asOf: string;
  quality: DataQualityStatus;
}

export interface DataManifest {
  schemaVersion: string;
  marketDate: string;
  generatedAt: string;
  pipelineVersion: string;
  dataSources: string[];
  mode: 'mock' | 'snapshot';
  note: string;
  provenance: {
    ohlcv: string;
    indicators: string;
    universe: string;
    comparisons: string;
  };
}

export interface IndexQuote {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
  vs50: number | null;
  vs200: number | null;
  trendState: TrendAlignment;
}

export interface SectorLeadershipRow {
  ticker: string;
  sectorId: SectorId;
  name: string;
  changePct: number;
  return1m: number | null;
  rs3mVsSpy: number | null;
  trendState: TrendAlignment;
}

export interface MarketOverview {
  asOf: string;
  generatedAt: string;
  regime: {
    state: string;
    label: string;
    summary: string;
  };
  metrics: MetricObservation[];
  indices: IndexQuote[];
  sectors: SectorLeadershipRow[];
  breadth: {
    above50: number | null;
    above50Count: number;
    above50Sample: number;
    above200: number | null;
    above200Count: number;
    above200Sample: number;
    highs20: number;
    lows20: number;
    illustrated: number;
  };
}

export interface SnapshotEnvelope<T> {
  schemaVersion: string;
  marketDate: string;
  generatedAt: string;
  pipelineVersion: string;
  dataSources: string[];
  payload: T;
}
