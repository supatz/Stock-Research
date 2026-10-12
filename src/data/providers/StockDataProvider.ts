import type { ChartRange, DataManifest, MarketOverview, OHLCVPoint, ScreenerRow, StockDetail, StockSummary } from '@/domain/types';

/**
 * UI-facing contract. Pages depend on this interface only.
 * MockDataProvider serves the demo. StaticSnapshotDataProvider will later read
 * Python-generated JSON from /data/v1 without changing page components.
 * Finance calculations stay out of React; they belong in the Python pipeline.
 */
export interface StockDataProvider {
  getManifest(): Promise<DataManifest>;
  getMarketOverview(): Promise<MarketOverview>;
  getUniverse(): Promise<StockSummary[]>;
  getScreener(): Promise<ScreenerRow[]>;
  getStockSummary(ticker: string): Promise<StockSummary>;
  getStockTechnicals(ticker: string): Promise<StockDetail>;
  getStockHistory(ticker: string, range?: ChartRange): Promise<OHLCVPoint[]>;
}

export class ProviderError extends Error {
  readonly code: 'NOT_FOUND' | 'UNAVAILABLE' | 'INVALID_SNAPSHOT';

  constructor(code: ProviderError['code'], message: string) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
  }
}
