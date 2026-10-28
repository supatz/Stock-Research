import { capTierFor, PROVENANCE_NOTE, sectorById, UNIVERSE_CONFIG } from '@/domain/config';
import { PERCENTILE_METRIC_IDS, getMetricDefinition } from '@/domain/metrics/definitions';
import {
  formatDollars,
  formatMultiple,
  formatNumber,
  formatPercent,
  formatPrice,
  formatSignedNumber,
  formatVolume,
  roundTo,
} from '@/domain/metrics/format';
import { presentationForState } from '@/domain/metrics/labels';
import {
  aboveAverageReading,
  adxReading,
  alignmentReading,
  breadthReading,
  breakoutReading,
  cmfReading,
  distanceHighReading,
  distanceLowReading,
  drawdownReading,
  histogramReading,
  macdReading,
  newHighLowReading,
  relativeStrengthReading,
  returnReading,
  rsiReading,
  slopeReading,
  structureWindowReading,
  vixReading,
  volatilityReading,
  volumeReading,
} from '@/domain/metrics/states';
import type {
  CapTier,
  CrossSectionComparison,
  DataManifest,
  DataQualityStatus,
  FinancialPeriod,
  HistoricalComparison,
  HorizonSet,
  MarketOverview,
  MetricObservation,
  ScreenerRow,
  SectorId,
  SectorLeadershipRow,
  OHLCVPoint,
  StockDetail,
  StockFinancials,
  StockSummary,
} from '@/domain/types';
import { buildSeries, type SeriesStats } from '@/data/mock/history';
import { BENCHMARKS, STOCKS, exchangeFor, type StockSeed } from '@/data/mock/seeds';

const PROVENANCE = 'Deterministic mock snapshot';
const HISTORY_MESSAGE = 'Historical percentile unavailable — requires at least 126 valid observations.';

interface CohortInfo {
  cohortLabel: string;
  sampleSize: number;
  fallbackLevel?: string;
  fallbackDetail?: string;
}

const MARKET_COHORT: CohortInfo = {
  cohortLabel: 'US Large/Mega Cap',
  sampleSize: 348,
};

const STALE_COHORT: CohortInfo = {
  cohortLabel: 'Excluded — stale price',
  sampleSize: 0,
  fallbackLevel: 'excluded',
  fallbackDetail: 'The last close is not the snapshot market date, so this name is left out of same-date peer percentiles.',
};

interface PercentileOverride {
  h?: number;
  s?: number;
  m?: number;
}

const PERCENTILE_OVERRIDES: Record<string, Record<string, PercentileOverride>> = {
  NVDA: {
    'vol.atr-pct': { h: 91, s: 88, m: 86 },
    'momentum.rsi14': { h: 93, s: 84, m: 90 },
  },
  TSLA: {
    'vol.atr-pct': { h: 97, s: 95, m: 96 },
  },
  AAPL: {
    'momentum.rsi14': { h: 86, s: 74, m: 80 },
  },
  CAT: {
    'rs.spy.6m': { h: 92, s: 81, m: 88 },
  },
};

export interface BuiltStock {
  summary: StockSummary;
  detail: StockDetail;
  history: OHLCVPoint[];
  screener: ScreenerRow;
}

export interface MockDatabase {
  manifest: DataManifest;
  overview: MarketOverview;
  stocks: BuiltStock[];
  byTicker: Map<string, BuiltStock>;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function jitter(ticker: string, metricId: string, bias: number): number {
  const noise = (hashString(`${ticker}:${metricId}`) % 9) - 4;
  return clamp(Math.round(50 + bias * 38 + noise), 4, 97);
}

function sectorCohort(sectorId: SectorId, capTier: CapTier): CohortInfo {
  const sector = sectorById(sectorId).label;
  const tier = capTier === 'mega' ? 'Mega Cap' : 'Large Cap';
  const specials: Record<string, CohortInfo> = {
    'information-technology:large': {
      cohortLabel: 'Technology',
      sampleSize: 61,
      fallbackLevel: 'sector',
      fallbackDetail: 'Technology / Large Cap had n=22, below the preferred minimum of 30.',
    },
    'utilities:large': {
      cohortLabel: 'Utilities',
      sampleSize: 26,
      fallbackLevel: 'sector',
      fallbackDetail: 'Utilities / Large Cap had n=14, below the minimum of 20.',
    },
    'real-estate:large': {
      cohortLabel: 'Real Estate',
      sampleSize: 24,
      fallbackLevel: 'sector',
      fallbackDetail: 'Real Estate / Large Cap had n=16, below the minimum of 20.',
    },
    'materials:large': {
      cohortLabel: 'Materials',
      sampleSize: 28,
      fallbackLevel: 'sector',
      fallbackDetail: 'Materials / Large Cap had n=19, below the minimum of 20.',
    },
    'materials:mega': {
      cohortLabel: 'Materials / Mega Cap',
      sampleSize: 31,
    },
  };
  return specials[`${sectorId}:${capTier}`] ?? {
    cohortLabel: `${sector} / ${tier}`,
    sampleSize: capTier === 'mega' ? 32 : 41,
  };
}

function excess(stock: number | null, benchmark: number | null): number | null {
  if (stock == null || benchmark == null) return null;
  return stock - benchmark;
}

function horizons(stock: SeriesStats, benchmark: SeriesStats): HorizonSet {
  return {
    m1: excess(stock.returns.m1, benchmark.returns.m1),
    m3: excess(stock.returns.m3, benchmark.returns.m3),
    m6: excess(stock.returns.m6, benchmark.returns.m6),
    m12: excess(stock.returns.y1, benchmark.returns.y1),
  };
}

interface MetricDraft {
  id: string;
  raw: number | string | null;
  display: string;
  state: string;
  shortText: string;
  unavailableMessage?: string;
}

interface AssembleContext {
  seed: StockSeed;
  stats: SeriesStats;
  asOf: string;
  quality: DataQualityStatus;
  capTier: CapTier;
  sectorCohort: CohortInfo;
  dates: string[];
  biases: {
    returns: number;
    rs: number;
    rsi: number;
    atr: number;
    drawdown: number;
    nearHigh: number;
    rvol: number;
  };
}

function biasFor(metricId: string, biases: AssembleContext['biases']): number {
  if (metricId === 'vol.atr-pct' || metricId.startsWith('vol.realized') || metricId === 'vol.bb-width') return biases.atr;
  if (metricId === 'momentum.rsi14') return biases.rsi;
  if (metricId.startsWith('rs.')) return biases.rs;
  if (metricId === 'vol.drawdown' || metricId === 'vol.max-drawdown-1y') return biases.drawdown;
  if (metricId === 'distance.52w-high') return biases.nearHigh;
  if (metricId === 'volume.rvol') return biases.rvol;
  return biases.returns;
}

function historicalFor(ctx: AssembleContext, metricId: string, rawMissing: boolean): HistoricalComparison | undefined {
  if (!PERCENTILE_METRIC_IDS.has(metricId)) return undefined;
  const sampleSize = Math.min(UNIVERSE_CONFIG.historicalLookbackDays, ctx.stats.sessions);
  const startDate = ctx.dates[ctx.dates.length - sampleSize];
  if (rawMissing || ctx.stats.sessions < UNIVERSE_CONFIG.historicalMinObservations || ctx.quality === 'insufficient') {
    return {
      percentile: null,
      sampleSize: ctx.stats.sessions,
      lookbackDays: UNIVERSE_CONFIG.historicalLookbackDays,
      startDate: ctx.dates[0],
      message: HISTORY_MESSAGE,
    };
  }
  const override = PERCENTILE_OVERRIDES[ctx.seed.ticker]?.[metricId]?.h;
  return {
    percentile: override ?? jitter(ctx.seed.ticker, metricId, biasFor(metricId, ctx.biases)),
    sampleSize,
    lookbackDays: UNIVERSE_CONFIG.historicalLookbackDays,
    startDate,
  };
}

function crossFor(
  ctx: AssembleContext,
  metricId: string,
  rawMissing: boolean,
  kind: 'sector' | 'market',
): CrossSectionComparison | undefined {
  if (!PERCENTILE_METRIC_IDS.has(metricId)) return undefined;
  if (rawMissing) {
    return {
      percentile: null,
      cohortLabel: 'Unavailable',
      sampleSize: 0,
      message: 'Peer percentile needs a raw value.',
    };
  }
  if (ctx.quality === 'stale') {
    return { percentile: null, ...STALE_COHORT, message: STALE_COHORT.fallbackDetail };
  }
  const cohort = kind === 'sector' ? ctx.sectorCohort : MARKET_COHORT;
  const override = PERCENTILE_OVERRIDES[ctx.seed.ticker]?.[metricId]?.[kind === 'sector' ? 's' : 'm'];
  return {
    percentile: override ?? jitter(ctx.seed.ticker, `${metricId}:${kind}`, biasFor(metricId, ctx.biases)),
    cohortLabel: cohort.cohortLabel,
    sampleSize: cohort.sampleSize,
    fallbackLevel: cohort.fallbackLevel,
    fallbackDetail: cohort.fallbackDetail,
  };
}

function observe(ctx: AssembleContext, draft: MetricDraft): MetricObservation {
  const definition = getMetricDefinition(draft.id);
  const rawMissing = draft.raw == null;
  let status: DataQualityStatus = 'good';
  let message: string | undefined;
  if (rawMissing && ctx.quality === 'partial' && draft.id === 'volume.cmf-20d') {
    status = 'partial';
    message = draft.unavailableMessage ?? 'CMF is unavailable because volume fields were missing. The gap is not filled with zero.';
  } else if (rawMissing) {
    status = 'insufficient';
    message = draft.unavailableMessage ?? 'Not enough data to calculate this metric.';
  } else if (ctx.quality === 'stale') {
    status = 'stale';
    message = `Last close is ${ctx.asOf}. Excluded from same-date peer percentiles.`;
  } else if (ctx.quality === 'insufficient' && PERCENTILE_METRIC_IDS.has(draft.id)) {
    status = 'insufficient';
    message = HISTORY_MESSAGE;
  } else if (ctx.quality === 'partial' && draft.id === 'volume.cmf-20d') {
    status = 'partial';
    message = 'CMF is unavailable because volume fields were missing. The gap is not filled with zero.';
  } else if (!ctx.stats.windowComplete && (draft.id.startsWith('distance.52w') || draft.id === 'return.1y' || draft.id === 'vol.max-drawdown-1y')) {
    status = 'partial';
    message = `The 52-week window is incomplete (${ctx.stats.sessions} sessions).`;
  }

  return {
    metricId: draft.id,
    asOf: ctx.asOf,
    rawValue: draft.raw,
    displayValue: rawMissing ? '—' : draft.display,
    unit: definition.unit,
    historical: historicalFor(ctx, draft.id, rawMissing),
    sectorRelative: crossFor(ctx, draft.id, rawMissing, 'sector'),
    marketRelative: crossFor(ctx, draft.id, rawMissing, 'market'),
    interpretation: {
      mode: definition.interpretationMode,
      state: rawMissing ? 'UNAVAILABLE' : draft.state,
      shortText: rawMissing ? (message ?? 'Unavailable') : draft.shortText,
    },
    dataQuality: { status, message },
    provenance: PROVENANCE,
  };
}

function riskBucket(value: number, quiet: number, normal: number, elevated: number, noun: string) {
  if (value < quiet) return { state: 'VOL_QUIET', shortText: `${noun} is quiet. Read it as a risk context, not a quality score.` };
  if (value < normal) return { state: 'VOL_NORMAL', shortText: `${noun} is in a normal range.` };
  if (value < elevated) return { state: 'VOL_ELEVATED', shortText: `${noun} is elevated. A high reading is not a better reading.` };
  return { state: 'VOL_EXTREME', shortText: `${noun} is extreme versus the display thresholds.` };
}

function numericDraft(
  id: string,
  value: number | null,
  display: string,
  reading: { state: string; shortText: string },
  unavailableMessage?: string,
): MetricDraft {
  return {
    id,
    raw: value == null ? null : roundTo(value, 4),
    display,
    state: reading.state,
    shortText: reading.shortText,
    unavailableMessage,
  };
}

function deriveRegime(spyAbove50: boolean, spyAbove200: boolean, qqqAbove200: boolean, breadth50: number, breadth200: number) {
  const qqqText = qqqAbove200 ? 'QQQ is above its 200-day average.' : 'QQQ is below its 200-day average.';
  if (!spyAbove200 && breadth50 < 40) {
    return {
      state: 'REGIME_RISK_OFF',
      label: 'Broad risk-off',
      summary: `SPY is below its 200-day average and breadth is weak. ${qqqText} Treat individual strength as selective.`,
    };
  }
  if (spyAbove200 && spyAbove50 && breadth50 >= 70 && breadth200 >= 60) {
    return {
      state: 'REGIME_RISK_ON',
      label: 'Risk-on / broad strength',
      summary: `SPY is above its 50- and 200-day averages, and participation is broad. ${qqqText}`,
    };
  }
  if (spyAbove200 && spyAbove50 && breadth50 < 65) {
    return {
      state: 'REGIME_POSITIVE_NARROWING',
      label: 'Positive but narrowing',
      summary: `The index trend is still positive, but participation is not broad. ${qqqText} Leadership is doing more of the work than the average stock.`,
    };
  }
  if (spyAbove200 && breadth50 < 45) {
    return {
      state: 'REGIME_DEFENSIVE',
      label: 'Defensive / weakening',
      summary: `Longer-term trend support is still intact, but breadth has weakened. ${qqqText}`,
    };
  }
  return {
    state: 'REGIME_MIXED',
    label: 'Mixed / range-bound',
    summary: `Index trend and breadth do not agree on one regime. ${qqqText}`,
  };
}

function buildBenchmarks(): Map<string, SeriesStats> {
  const map = new Map<string, SeriesStats>();
  for (const seed of BENCHMARKS) {
    map.set(seed.ticker, buildSeries({
      ticker: seed.ticker,
      endPrice: seed.price,
      endDate: UNIVERSE_CONFIG.marketDate,
      sessions: 520,
      growth: seed.growth,
      kind: 'geometric',
      wave: 0.008,
      bend: 0,
      rangeFrac: seed.rangeFrac ?? 0.011,
      pinNearHigh: false,
      averageVolume: 40_000_000,
      rvol: 1,
    }));
  }
  return map;
}

function seriesFor(seed: StockSeed): SeriesStats {
  return buildSeries({
    ticker: seed.ticker,
    endPrice: seed.price,
    endDate: seed.endDate ?? UNIVERSE_CONFIG.marketDate,
    sessions: seed.sessions ?? 520,
    growth: seed.growth,
    kind: seed.kind ?? 'geometric',
    peak: seed.peak,
    wave: seed.wave ?? 0.012,
    bend: seed.bend ?? 0,
    rangeFrac: seed.rangeFrac ?? 0.014,
    pinNearHigh: seed.pinNearHigh ?? false,
    averageVolume: seed.avgVolumeM * 1_000_000,
    rvol: seed.rvol,
  });
}

function hashTicker(ticker: string): number {
  let value = 0;
  for (let index = 0; index < ticker.length; index += 1) {
    value = (value * 31 + ticker.charCodeAt(index)) % 10_000;
  }
  return value;
}

function buildFinancials(seed: StockSeed): StockFinancials {
  const hash = hashTicker(seed.ticker);
  const baseRevenue = seed.marketCapB * (0.12 + (hash % 17) / 100);
  const periods: FinancialPeriod[] = [];
  for (let year = 2021; year <= 2025; year += 1) {
    const age = year - 2021;
    const growth = 1 + seed.growth / 100;
    const revenue = roundTo(baseRevenue * growth ** age * (0.92 + ((hash + age * 7) % 11) / 100), 2) * 1e9;
    const operatingMargin = roundTo(8 + (hash % 20) + age * 0.4 - (seed.kind === 'peak' ? 4 : 0), 1);
    const grossMargin = roundTo(Math.min(78, operatingMargin + 18 + (hash % 9)), 1);
    const netMargin = roundTo(operatingMargin - 2.4 + ((hash + age) % 5) * 0.2, 1);
    const netIncome = roundTo(revenue * (netMargin / 100), 2);
    const shares = Math.max(0.4, seed.marketCapB / Math.max(seed.price, 1));
    const eps = roundTo(netIncome / (shares * 1e9), 2);
    const freeCashFlow = roundTo(netIncome * (0.75 + ((hash + age * 3) % 8) / 20), 2);
    periods.push({
      period: `FY${year}`,
      revenue,
      netIncome,
      eps,
      grossMargin,
      operatingMargin,
      freeCashFlow,
    });
  }
  const latest = periods[periods.length - 1]!;
  const prior = periods[periods.length - 2]!;
  const revenueGrowth = prior.revenue ? ((latest.revenue / prior.revenue) - 1) * 100 : 0;
  return {
    currency: 'USD',
    periods,
    takeaway: `${seed.ticker} mock financials show FY${latest.period.slice(2)} revenue of ${formatDollars(latest.revenue)} with operating margin ${formatPercent(latest.operatingMargin, 1, false)}. Year-over-year revenue is ${formatPercent(revenueGrowth)}.`,
    provenance: 'Deterministic mock fundamentals for interface development — not reported company filings.',
  };
}

function qualityMessage(seed: StockSeed, sessions: number): string | undefined {
  if (seed.quality === 'stale') {
    return `Stale price: last close is ${seed.endDate}, before the market date ${UNIVERSE_CONFIG.marketDate}.`;
  }
  if (seed.quality === 'insufficient') {
    return `${HISTORY_MESSAGE} This series has ${sessions} sessions.`;
  }
  if (seed.quality === 'partial') {
    return 'CMF 20D is unavailable for this snapshot. Other metrics are current.';
  }
  return undefined;
}

function assembleStock(
  seed: StockSeed,
  stats: SeriesStats,
  benchmarks: Map<string, SeriesStats>,
  regime: ReturnType<typeof deriveRegime>,
): BuiltStock {
  const sector = sectorById(seed.sectorId);
  const spy = benchmarks.get('SPY');
  const sectorSeries = benchmarks.get(sector.etf);
  if (!spy || !sectorSeries) {
    throw new Error(`Missing benchmark for ${seed.ticker}`);
  }
  const vsSpy = horizons(stats, spy);
  const vsSector = horizons(stats, sectorSeries);
  const rs = relativeStrengthReading(vsSpy.m6, vsSector.m6);
  const alignment = alignmentReading(stats.last, stats.sma20, stats.sma50, stats.sma200);
  const rsi = rsiReading(seed.rsi);
  const adx = adxReading(seed.adx);
  const volatility = stats.atrPct == null
    ? { state: 'UNAVAILABLE', shortText: 'ATR % is unavailable.' }
    : volatilityReading(stats.atrPct);
  const participation = volumeReading(seed.rvol);
  const capTier = capTierFor(seed.marketCapB * 1e9);
  const asOf = seed.endDate ?? UNIVERSE_CONFIG.marketDate;
  const quality = seed.quality ?? 'good';
  const cmf = seed.cmf === undefined
    ? roundTo(clamp(((vsSpy.m6 ?? 0) / 8) * 0.18 + ((hashString(seed.ticker) % 17) - 8) / 100, -0.35, 0.35), 2)
    : seed.cmf;
  const breakoutKind = (stats.high20 || stats.high55)
    ? (seed.rvol >= 1.25 ? 'confirmed' : 'price-only')
    : 'none';
  const sectorExcess3m = excess(sectorSeries.returns.m3, spy.returns.m3);

  const ctx: AssembleContext = {
    seed,
    stats,
    asOf,
    quality,
    capTier,
    sectorCohort: sectorCohort(seed.sectorId, capTier),
    dates: stats.points.map((point) => point.date),
    biases: {
      returns: clamp((stats.returns.m6 ?? 0) / 15, -1, 1),
      rs: clamp((vsSpy.m6 ?? 0) / 8, -1, 1),
      rsi: clamp((seed.rsi - 50) / 25, -1, 1),
      atr: clamp(((stats.atrPct ?? 1.8) - 1.8) / 1.5, -1, 1),
      drawdown: clamp(((stats.drawdown ?? -10) + 15) / 20, -1, 1),
      nearHigh: clamp(((stats.distHigh ?? -10) + 8) / 12, -1, 1),
      rvol: clamp((seed.rvol - 1) / 1.2, -1, 1),
    },
  };

  const distance = (value: number | null) => (value == null
    ? { state: 'UNAVAILABLE', shortText: 'Distance is unavailable.' }
    : value >= 0
      ? { state: 'PRICE_ABOVE', shortText: `Price is ${formatPercent(value)} versus this average.` }
      : { state: 'PRICE_BELOW', shortText: `Price is ${formatPercent(value)} versus this average.` });

  const drafts: MetricDraft[] = [
    numericDraft('return.1d', stats.returns.d1, formatPercent(stats.returns.d1), stats.returns.d1 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(stats.returns.d1), '1-day return needs 2 sessions.'),
    numericDraft('return.5d', stats.returns.d5, formatPercent(stats.returns.d5), stats.returns.d5 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(stats.returns.d5), '5-day return needs 6 sessions.'),
    numericDraft('return.1m', stats.returns.m1, formatPercent(stats.returns.m1), stats.returns.m1 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(stats.returns.m1), '1-month return needs 22 sessions.'),
    numericDraft('return.3m', stats.returns.m3, formatPercent(stats.returns.m3), stats.returns.m3 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(stats.returns.m3), '3-month return needs 64 sessions.'),
    numericDraft('return.6m', stats.returns.m6, formatPercent(stats.returns.m6), stats.returns.m6 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(stats.returns.m6), '6-month return needs 127 sessions.'),
    numericDraft('return.ytd', stats.returns.ytd, formatPercent(stats.returns.ytd), stats.returns.ytd == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(stats.returns.ytd), 'Year-to-date return needs a prior-year close.'),
    numericDraft('return.1y', stats.returns.y1, formatPercent(stats.returns.y1), stats.returns.y1 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(stats.returns.y1), '1-year return needs 252 sessions.'),
    numericDraft('distance.52w-high', stats.distHigh, formatPercent(stats.distHigh), stats.distHigh == null ? { state: 'UNAVAILABLE', shortText: '' } : distanceHighReading(stats.distHigh)),
    numericDraft('distance.52w-low', stats.distLow, formatPercent(stats.distLow), stats.distLow == null ? { state: 'UNAVAILABLE', shortText: '' } : distanceLowReading(stats.distLow)),
    {
      id: 'trend.alignment',
      raw: alignment.state,
      display: presentationForState(alignment.state).label,
      state: alignment.state,
      shortText: alignment.shortText,
    },
    numericDraft('trend.sma20', stats.sma20, formatPrice(stats.sma20), stats.slope20 == null ? { state: 'UNAVAILABLE', shortText: '' } : slopeReading(stats.slope20), 'SMA 20 needs 20 sessions.'),
    numericDraft('trend.sma50', stats.sma50, formatPrice(stats.sma50), stats.slope50 == null ? { state: 'UNAVAILABLE', shortText: '' } : slopeReading(stats.slope50), 'SMA 50 needs 50 sessions.'),
    numericDraft('trend.sma200', stats.sma200, formatPrice(stats.sma200), stats.slope200 == null ? { state: 'UNAVAILABLE', shortText: '' } : slopeReading(stats.slope200), 'SMA 200 unavailable — 200 valid sessions are required.'),
    numericDraft('trend.dist-sma20', stats.dist20, formatPercent(stats.dist20), distance(stats.dist20), 'Distance from SMA 20 needs 20 sessions.'),
    numericDraft('trend.dist-sma50', stats.dist50, formatPercent(stats.dist50), distance(stats.dist50), 'Distance from SMA 50 needs 50 sessions.'),
    numericDraft('trend.dist-sma200', stats.dist200, formatPercent(stats.dist200), distance(stats.dist200), 'Distance from SMA 200 needs 200 sessions.'),
    numericDraft('trend.slope-sma20', stats.slope20, formatPercent(stats.slope20, 2), stats.slope20 == null ? { state: 'UNAVAILABLE', shortText: '' } : slopeReading(stats.slope20), 'SMA 20 slope needs 30 sessions.'),
    numericDraft('trend.slope-sma50', stats.slope50, formatPercent(stats.slope50, 2), stats.slope50 == null ? { state: 'UNAVAILABLE', shortText: '' } : slopeReading(stats.slope50), 'SMA 50 slope needs 60 sessions.'),
    numericDraft('trend.slope-sma200', stats.slope200, formatPercent(stats.slope200, 2), stats.slope200 == null ? { state: 'UNAVAILABLE', shortText: '' } : slopeReading(stats.slope200), 'SMA 200 slope needs 210 sessions.'),
    numericDraft('trend.adx', seed.adx, formatNumber(seed.adx, 1), adx),
    numericDraft('momentum.rsi14', seed.rsi, formatNumber(seed.rsi, 1), rsi),
  ];

  if (stats.macd) {
    const macdState = macdReading(stats.macd.aboveSignal, stats.macd.aboveZero);
    drafts.push(
      numericDraft('momentum.macd', stats.macd.macd, formatSignedNumber(stats.macd.macd, 2), macdState),
      numericDraft('momentum.macd-signal', stats.macd.signal, formatSignedNumber(stats.macd.signal, 2), {
        state: 'COUNT',
        shortText: 'Signal is the 9-period average of the MACD line.',
      }),
      numericDraft('momentum.macd-histogram', stats.macd.histogram, formatSignedNumber(stats.macd.histogram, 2), histogramReading(stats.macd.histogram, stats.macd.direction)),
    );
  } else {
    drafts.push(
      numericDraft('momentum.macd', null, '—', { state: 'UNAVAILABLE', shortText: '' }, 'MACD needs about 35 sessions.'),
      numericDraft('momentum.macd-signal', null, '—', { state: 'UNAVAILABLE', shortText: '' }, 'MACD signal needs about 35 sessions.'),
      numericDraft('momentum.macd-histogram', null, '—', { state: 'UNAVAILABLE', shortText: '' }, 'MACD histogram needs about 35 sessions.'),
    );
  }

  drafts.push(
    numericDraft('momentum.roc20', stats.roc20, formatPercent(stats.roc20), stats.roc20 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(stats.roc20), 'ROC 20D needs 21 sessions.'),
    numericDraft('momentum.roc63', stats.roc63, formatPercent(stats.roc63), stats.roc63 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(stats.roc63), 'ROC 63D needs 64 sessions.'),
    numericDraft('rs.spy.1m', vsSpy.m1, formatPercent(vsSpy.m1), vsSpy.m1 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(vsSpy.m1), '1-month excess return needs 22 sessions.'),
    numericDraft('rs.spy.3m', vsSpy.m3, formatPercent(vsSpy.m3), vsSpy.m3 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(vsSpy.m3), '3-month excess return needs 64 sessions.'),
    numericDraft('rs.spy.6m', vsSpy.m6, formatPercent(vsSpy.m6), vsSpy.m6 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(vsSpy.m6), '6-month excess return needs 127 sessions.'),
    numericDraft('rs.spy.12m', vsSpy.m12, formatPercent(vsSpy.m12), vsSpy.m12 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(vsSpy.m12), '12-month excess return needs 252 sessions.'),
    numericDraft('rs.sector.1m', vsSector.m1, formatPercent(vsSector.m1), vsSector.m1 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(vsSector.m1), '1-month sector excess needs 22 sessions.'),
    numericDraft('rs.sector.3m', vsSector.m3, formatPercent(vsSector.m3), vsSector.m3 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(vsSector.m3), '3-month sector excess needs 64 sessions.'),
    numericDraft('rs.sector.6m', vsSector.m6, formatPercent(vsSector.m6), vsSector.m6 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(vsSector.m6), '6-month sector excess needs 127 sessions.'),
    numericDraft('rs.sector.12m', vsSector.m12, formatPercent(vsSector.m12), vsSector.m12 == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(vsSector.m12), '12-month sector excess needs 252 sessions.'),
    {
      id: 'rs.state',
      raw: rs.state,
      display: presentationForState(rs.state).label,
      state: rs.state,
      shortText: rs.shortText,
    },
    numericDraft('vol.atr-pct', stats.atrPct, formatPercent(stats.atrPct, 1, false), volatility, 'ATR % needs 15 sessions.'),
    numericDraft('vol.realized-20d', stats.rv20, formatPercent(stats.rv20, 1, false), stats.rv20 == null ? { state: 'UNAVAILABLE', shortText: '' } : riskBucket(stats.rv20, 14, 24, 38, '20-day realized volatility'), '20-day realized volatility needs 21 sessions.'),
    numericDraft('vol.realized-60d', stats.rv60, formatPercent(stats.rv60, 1, false), stats.rv60 == null ? { state: 'UNAVAILABLE', shortText: '' } : riskBucket(stats.rv60, 14, 24, 38, '60-day realized volatility'), '60-day realized volatility needs 61 sessions.'),
    numericDraft('vol.bb-width', stats.bbWidth, formatPercent(stats.bbWidth, 1, false), stats.bbWidth == null ? { state: 'UNAVAILABLE', shortText: '' } : riskBucket(stats.bbWidth, 8, 16, 28, 'Bollinger width'), 'Bollinger width needs 20 sessions.'),
    numericDraft('vol.drawdown', stats.drawdown, formatPercent(stats.drawdown), stats.drawdown == null ? { state: 'UNAVAILABLE', shortText: '' } : drawdownReading(stats.drawdown)),
    numericDraft('vol.max-drawdown-1y', stats.maxDrawdown1y, formatPercent(stats.maxDrawdown1y), stats.maxDrawdown1y == null ? { state: 'UNAVAILABLE', shortText: '' } : drawdownReading(stats.maxDrawdown1y), '1-year maximum drawdown needs a longer history.'),
    {
      id: 'volume.daily',
      raw: stats.lastVolume,
      display: formatVolume(stats.lastVolume),
      state: 'COUNT',
      shortText: 'Shares traded on the latest session in the snapshot.',
    },
    {
      id: 'volume.avg-20d',
      raw: stats.averageVolume,
      display: formatVolume(stats.averageVolume),
      state: 'COUNT',
      shortText: 'Baseline share volume used for relative volume.',
    },
    numericDraft('volume.rvol', seed.rvol, formatMultiple(seed.rvol), participation),
    {
      id: 'volume.dollar-avg-20d',
      raw: Math.round(stats.averageVolume * stats.last),
      display: formatDollars(stats.averageVolume * stats.last),
      state: 'COUNT',
      shortText: 'Typical traded dollar value, using the 20-day share average and the latest close.',
    },
    numericDraft('volume.cmf-20d', cmf, formatSignedNumber(cmf, 2), cmf == null ? { state: 'UNAVAILABLE', shortText: '' } : cmfReading(cmf), 'CMF is unavailable because volume fields were missing. The gap is not filled with zero.'),
    {
      id: 'structure.20d',
      raw: stats.high20 == null ? null : (stats.high20 ? 'high' : stats.low20 ? 'low' : 'inside'),
      display: presentationForState(structureWindowReading(Boolean(stats.high20), Boolean(stats.low20)).state).label,
      state: stats.high20 == null ? 'UNAVAILABLE' : structureWindowReading(Boolean(stats.high20), Boolean(stats.low20)).state,
      shortText: stats.high20 == null ? '20-day range is unavailable.' : structureWindowReading(Boolean(stats.high20), Boolean(stats.low20)).shortText,
    },
    {
      id: 'structure.55d',
      raw: stats.high55 == null ? null : (stats.high55 ? 'high' : stats.low55 ? 'low' : 'inside'),
      display: presentationForState(structureWindowReading(Boolean(stats.high55), Boolean(stats.low55)).state).label,
      state: stats.high55 == null ? 'UNAVAILABLE' : structureWindowReading(Boolean(stats.high55), Boolean(stats.low55)).state,
      shortText: stats.high55 == null ? '55-day range is unavailable.' : structureWindowReading(Boolean(stats.high55), Boolean(stats.low55)).shortText,
    },
    {
      id: 'structure.breakout',
      raw: breakoutKind,
      display: presentationForState(breakoutReading(breakoutKind).state).label,
      state: breakoutReading(breakoutKind).state,
      shortText: breakoutReading(breakoutKind).shortText,
    },
    numericDraft('market.sector-vs-spy', sectorExcess3m, formatPercent(sectorExcess3m), sectorExcess3m == null ? { state: 'UNAVAILABLE', shortText: '' } : returnReading(sectorExcess3m)),
  );

  const metrics: Record<string, MetricObservation> = {};
  for (const draft of drafts) {
    metrics[draft.id] = observe(ctx, draft);
  }

  const summary: StockSummary = {
    ticker: seed.ticker,
    company: seed.company,
    market: 'US',
    timezone: 'America/New_York',
    currency: 'USD',
    exchange: exchangeFor(seed),
    sectorId: seed.sectorId,
    sector: sector.label,
    industry: seed.industry,
    capTier,
    marketCap: seed.marketCapB * 1e9,
    price: stats.last,
    dailyChange: stats.change,
    dailyChangePct: stats.changePct,
    asOf,
    sectorBenchmark: sector.etf,
    trendState: alignment.state,
    rsState: rs.state,
    rsi: seed.rsi,
    adx: seed.adx,
    atrPct: stats.atrPct,
    atrPercentile: metrics['vol.atr-pct']?.historical?.percentile ?? null,
    rvol: seed.rvol,
    return1m: stats.returns.m1,
    return6mVsSpy: vsSpy.m6,
    distance52wHigh: stats.distHigh,
    quality,
    qualityMessage: qualityMessage(seed, stats.sessions),
  };

  const direction = stats.changePct >= 0 ? 'up' : 'down';
  const financials = buildFinancials(seed);
  const detail: StockDetail = {
    summary,
    metrics,
    dimensions: [
      {
        id: 'trend',
        label: 'Trend',
        state: alignment.state,
        shortText: alignment.shortText,
        primary: `ADX ${formatNumber(seed.adx, 1)}`,
        sectionId: 'section.stock.trend',
      },
      {
        id: 'momentum',
        label: 'Momentum',
        state: rsi.state,
        shortText: rsi.shortText,
        primary: `RSI ${formatNumber(seed.rsi, 1)}`,
        sectionId: 'section.stock.momentum',
      },
      {
        id: 'relative-strength',
        label: 'Relative Strength',
        state: rs.state,
        shortText: rs.shortText,
        primary: formatPercent(vsSpy.m6),
        sectionId: 'section.stock.relative-strength',
      },
      {
        id: 'volatility',
        label: 'Volatility / Risk',
        state: volatility.state,
        shortText: volatility.shortText,
        primary: formatPercent(stats.atrPct, 1, false),
        sectionId: 'section.stock.volatility',
      },
      {
        id: 'volume',
        label: 'Volume / Participation',
        state: participation.state,
        shortText: participation.shortText,
        primary: formatMultiple(seed.rvol),
        sectionId: 'section.stock.volume',
      },
      {
        id: 'market',
        label: 'Market Context',
        state: regime.state,
        shortText: regime.summary,
        primary: regime.label,
        sectionId: 'section.stock.market-context',
      },
    ],
    takeaways: {
      performance: `Over one month the price is ${formatPercent(stats.returns.m1)}; over six months it is ${formatPercent(stats.returns.m6)}. Compare those paths with SPY before treating them as unusual.`,
      trend: alignment.shortText,
      momentum: `${rsi.shortText} ${stats.macd ? histogramReading(stats.macd.histogram, stats.macd.direction).shortText : 'MACD is unavailable.'}`,
      relativeStrength: `${rs.shortText} The sector benchmark is ${sector.etf}.`,
      volatility: volatility.shortText,
      volume: `${participation.shortText} The latest session was ${direction} ${formatPercent(stats.changePct)}.`,
      structure: `${breakoutReading(breakoutKind).shortText} Distance from the 52-week high is ${formatPercent(stats.distHigh)}.`,
      market: `${regime.summary} ${sector.label} versus SPY over three months is ${formatPercent(sectorExcess3m)}.`,
      financials: financials.takeaway,
    },
    movingAverages: {
      sma20: stats.sma20,
      sma50: stats.sma50,
      sma200: stats.sma200,
      dist20: stats.dist20,
      dist50: stats.dist50,
      dist200: stats.dist200,
      slope20: stats.slope20,
      slope50: stats.slope50,
      slope200: stats.slope200,
      alignment: alignment.state,
    },
    relativeStrength: {
      state: rs.state,
      vsSpy,
      vsSector,
      sectorEtf: sector.etf,
    },
    structure: {
      distHigh: stats.distHigh,
      distLow: stats.distLow,
      high20: stats.high20,
      low20: stats.low20,
      high55: stats.high55,
      low55: stats.low55,
      breakout: breakoutKind,
      drawdown: stats.drawdown,
      maxDrawdown1y: stats.maxDrawdown1y,
      windowComplete: stats.windowComplete,
    },
    financials,
    sessions: stats.sessions,
  };

  const screener: ScreenerRow = {
    ticker: summary.ticker,
    company: summary.company,
    sectorId: summary.sectorId,
    sector: summary.sector,
    capTier: summary.capTier,
    marketCap: summary.marketCap,
    price: summary.price,
    dailyChangePct: summary.dailyChangePct,
    return1m: summary.return1m,
    rs6mVsSpy: summary.return6mVsSpy,
    trendState: summary.trendState,
    rsi: summary.rsi,
    adx: summary.adx,
    atrPct: summary.atrPct,
    atrPercentile: summary.atrPercentile,
    rvol: summary.rvol,
    distance52wHigh: summary.distance52wHigh,
    rsState: summary.rsState,
    asOf: summary.asOf,
    quality: summary.quality,
  };

  return { summary, detail, history: stats.points, screener };
}

function countBreadth(stocks: BuiltStock[]) {
  const eligible = stocks.filter((stock) => stock.summary.quality !== 'stale');
  const with50 = eligible.filter((stock) => stock.detail.movingAverages.sma50 != null);
  const above50 = with50.filter((stock) => (stock.detail.movingAverages.dist50 ?? 0) > 0);
  const with200 = eligible.filter((stock) => stock.detail.movingAverages.sma200 != null);
  const above200 = with200.filter((stock) => (stock.detail.movingAverages.dist200 ?? 0) > 0);
  const highs20 = eligible.filter((stock) => stock.detail.structure.high20).length;
  const lows20 = eligible.filter((stock) => stock.detail.structure.low20).length;
  return {
    above50: with50.length ? (above50.length / with50.length) * 100 : null,
    above50Count: above50.length,
    above50Sample: with50.length,
    above200: with200.length ? (above200.length / with200.length) * 100 : null,
    above200Count: above200.length,
    above200Sample: with200.length,
    highs20,
    lows20,
    illustrated: eligible.length,
  };
}

function marketObserve(
  id: string,
  asOf: string,
  raw: number | string | null,
  display: string,
  state: string,
  shortText: string,
  historical?: HistoricalComparison,
): MetricObservation {
  const definition = getMetricDefinition(id);
  return {
    metricId: id,
    asOf,
    rawValue: raw,
    displayValue: display,
    unit: definition.unit,
    historical,
    interpretation: {
      mode: definition.interpretationMode,
      state,
      shortText,
    },
    dataQuality: { status: 'good' },
    provenance: PROVENANCE,
  };
}

function buildOverview(stocks: BuiltStock[], benchmarks: Map<string, SeriesStats>, regime: ReturnType<typeof deriveRegime>): MarketOverview {
  const asOf = UNIVERSE_CONFIG.marketDate;
  const spy = benchmarks.get('SPY');
  const qqq = benchmarks.get('QQQ');
  if (!spy || !qqq) throw new Error('SPY and QQQ are required');
  const breadth = countBreadth(stocks);
  const breadth50 = breadth.above50 ?? 0;
  const breadth200 = breadth.above200 ?? 0;
  const breadth50Reading = breadthReading(breadth50);
  const breadth200Reading = breadthReading(breadth200);
  const highLow = newHighLowReading(breadth.highs20, breadth.lows20);
  const vix = vixReading(16.4);
  const spy50 = aboveAverageReading(spy.dist50 ?? 0);
  const spy200 = aboveAverageReading(spy.dist200 ?? 0);
  const qqq200 = aboveAverageReading(qqq.dist200 ?? 0);

  const indices = ['SPY', 'QQQ', 'DIA', 'IWM'].map((ticker) => {
    const series = benchmarks.get(ticker);
    const seed = BENCHMARKS.find((item) => item.ticker === ticker);
    if (!series || !seed) throw new Error(`Missing index ${ticker}`);
    return {
      ticker,
      name: seed.name,
      price: series.last,
      changePct: series.changePct,
      vs50: series.dist50,
      vs200: series.dist200,
      trendState: series.alignment,
    };
  });

  const sectors: SectorLeadershipRow[] = BENCHMARKS
    .filter((seed) => seed.ticker.startsWith('XL'))
    .map((seed) => {
      const series = benchmarks.get(seed.ticker);
      if (!series) throw new Error(`Missing ${seed.ticker}`);
      const sector = [...new Set(STOCKS.map((stock) => stock.sectorId))]
        .map((id) => sectorById(id))
        .find((item) => item.etf === seed.ticker);
      return {
        ticker: seed.ticker,
        sectorId: sector?.id ?? 'information-technology',
        name: sector?.label ?? seed.name,
        changePct: series.changePct,
        return1m: series.returns.m1,
        rs3mVsSpy: excess(series.returns.m3, spy.returns.m3),
        trendState: series.alignment,
      };
    })
    .sort((a, b) => (b.rs3mVsSpy ?? -999) - (a.rs3mVsSpy ?? -999));

  const metrics = [
    marketObserve('market.regime', asOf, regime.state, regime.label, regime.state, regime.summary),
    marketObserve('market.spy-vs-50dma', asOf, roundTo(spy.dist50 ?? 0, 2), formatPercent(spy.dist50), spy50.state, spy50.shortText),
    marketObserve('market.spy-vs-200dma', asOf, roundTo(spy.dist200 ?? 0, 2), formatPercent(spy.dist200), spy200.state, spy200.shortText),
    marketObserve('market.qqq-vs-200dma', asOf, roundTo(qqq.dist200 ?? 0, 2), formatPercent(qqq.dist200), qqq200.state, qqq200.shortText),
    marketObserve(
      'market.breadth-50dma',
      asOf,
      breadth.above50 == null ? null : roundTo(breadth.above50, 1),
      `${formatPercent(breadth.above50, 0, false)} · ${breadth.above50Count} of ${breadth.above50Sample}`,
      breadth50Reading.state,
      breadth50Reading.shortText,
    ),
    marketObserve(
      'market.breadth-200dma',
      asOf,
      breadth.above200 == null ? null : roundTo(breadth.above200, 1),
      `${formatPercent(breadth.above200, 0, false)} · ${breadth.above200Count} of ${breadth.above200Sample}`,
      breadth200Reading.state,
      breadth200Reading.shortText,
    ),
    marketObserve('market.vix', asOf, 16.4, '16.4', vix.state, vix.shortText, {
      percentile: 36,
      sampleSize: 504,
      lookbackDays: 504,
      startDate: '2024-10-11',
    }),
    marketObserve('market.highs-20d', asOf, breadth.highs20, String(breadth.highs20), highLow.state, highLow.shortText),
    marketObserve('market.lows-20d', asOf, breadth.lows20, String(breadth.lows20), highLow.state, highLow.shortText),
  ];

  return {
    asOf,
    generatedAt: UNIVERSE_CONFIG.generatedAt,
    regime,
    metrics,
    indices,
    sectors,
    breadth,
  };
}

function buildMock(): MockDatabase {
  const benchmarks = buildBenchmarks();
  const spy = benchmarks.get('SPY');
  const qqq = benchmarks.get('QQQ');
  if (!spy || !qqq) throw new Error('Benchmarks failed');
  const preliminary = STOCKS.map((seed) => ({ seed, stats: seriesFor(seed) }));
  const tempStocks = preliminary.map((item) => assembleStock(item.seed, item.stats, benchmarks, {
    state: 'REGIME_MIXED',
    label: 'Mixed / range-bound',
    summary: '',
  }));
  const breadth = countBreadth(tempStocks);
  const regime = deriveRegime(
    (spy.dist50 ?? -1) >= 0,
    (spy.dist200 ?? -1) >= 0,
    (qqq.dist200 ?? -1) >= 0,
    breadth.above50 ?? 0,
    breadth.above200 ?? 0,
  );
  const stocks = preliminary.map((item) => assembleStock(item.seed, item.stats, benchmarks, regime));
  const manifest: DataManifest = {
    schemaVersion: UNIVERSE_CONFIG.schemaVersion,
    marketDate: UNIVERSE_CONFIG.marketDate,
    generatedAt: UNIVERSE_CONFIG.generatedAt,
    pipelineVersion: 'mock-1.0.0',
    dataSources: ['deterministic-mock-fixture'],
    mode: 'mock',
    note: PROVENANCE_NOTE,
    provenance: {
      ohlcv: 'mock-price-path',
      indicators: 'mock-price-path for averages, returns, volatility, and MACD; fixtures for RSI, ADX, CMF, and VIX',
      universe: 'mock-fixture',
      comparisons: 'internal:v1-mock',
    },
  };
  return {
    manifest,
    overview: buildOverview(stocks, benchmarks, regime),
    stocks,
    byTicker: new Map(stocks.map((stock) => [stock.summary.ticker, stock])),
  };
}

let cached: MockDatabase | null = null;

export function getBuiltMock(): MockDatabase {
  if (!cached) cached = buildMock();
  return cached;
}

export function resetMockCache(): void {
  cached = null;
}
