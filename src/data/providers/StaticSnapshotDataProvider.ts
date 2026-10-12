import type { ChartRange, DataManifest, MarketOverview, OHLCVPoint, ScreenerRow, SnapshotEnvelope, StockDetail, StockSummary } from '@/domain/types';
import { ProviderError, type StockDataProvider } from '@/data/providers/StockDataProvider';

/**
 * Production V1 reader. It fetches schema-versioned JSON written by the Python
 * pipeline under public/data/v1. It does not calculate indicators.
 *
 * Expected files, once the pipeline exists:
 * - /data/v1/manifest.json
 * - /data/v1/market/overview.json
 * - /data/v1/universe.json
 * - /data/v1/screener.json
 * - /data/v1/stocks/{TICKER}/summary.json
 * - /data/v1/stocks/{TICKER}/technicals.json
 * - /data/v1/stocks/{TICKER}/history.json
 */
export class StaticSnapshotDataProvider implements StockDataProvider {
  constructor(private readonly baseUrl = '/data/v1') {}

  getManifest() {
    return this.load<DataManifest>(`${this.baseUrl}/manifest.json`, false);
  }

  getMarketOverview() {
    return this.payload<MarketOverview>(`${this.baseUrl}/market/overview.json`);
  }

  getUniverse() {
    return this.payload<StockSummary[]>(`${this.baseUrl}/universe.json`);
  }

  getScreener() {
    return this.payload<ScreenerRow[]>(`${this.baseUrl}/screener.json`);
  }

  getStockSummary(ticker: string) {
    return this.payload<StockSummary>(`${this.baseUrl}/stocks/${ticker.toUpperCase()}/summary.json`);
  }

  getStockTechnicals(ticker: string) {
    return this.payload<StockDetail>(`${this.baseUrl}/stocks/${ticker.toUpperCase()}/technicals.json`);
  }

  getStockHistory(ticker: string, _range?: ChartRange) {
    return this.payload<OHLCVPoint[]>(`${this.baseUrl}/stocks/${ticker.toUpperCase()}/history.json`);
  }

  private async payload<T>(path: string): Promise<T> {
    const envelope = await this.load<SnapshotEnvelope<T>>(path, true);
    return envelope.payload;
  }

  private async load<T>(path: string, enveloped: boolean): Promise<T> {
    let response: Response;
    try {
      response = await fetch(path);
    } catch {
      throw new ProviderError('UNAVAILABLE', `Could not reach snapshot ${path}.`);
    }
    if (response.status === 404) {
      throw new ProviderError('NOT_FOUND', `Snapshot not found at ${path}.`);
    }
    if (!response.ok) {
      throw new ProviderError('UNAVAILABLE', `Snapshot request failed for ${path}.`);
    }
    const body = (await response.json()) as T;
    if (enveloped) {
      assertEnvelope(body);
    }
    return body;
  }
}

function assertEnvelope(value: unknown): asserts value is SnapshotEnvelope<unknown> {
  if (!value || typeof value !== 'object') {
    throw new ProviderError('INVALID_SNAPSHOT', 'Snapshot response was not an object.');
  }
  const record = value as Partial<SnapshotEnvelope<unknown>>;
  if (typeof record.schemaVersion !== 'string' || typeof record.marketDate !== 'string' || !('payload' in record)) {
    throw new ProviderError('INVALID_SNAPSHOT', 'Snapshot is missing schemaVersion, marketDate, or payload.');
  }
}
