import type { ChartRange, OHLCVPoint } from '@/domain/types';
import { getBuiltMock } from '@/data/mock/build';
import { ProviderError, type StockDataProvider } from '@/data/providers/StockDataProvider';

const RANGE_SESSIONS: Record<ChartRange, number> = {
  '3M': 63,
  '6M': 126,
  '1Y': 252,
  '2Y': 520,
};

function sliceHistory(points: OHLCVPoint[], range?: ChartRange): OHLCVPoint[] {
  if (!range) return points;
  const sessions = RANGE_SESSIONS[range];
  return points.slice(-sessions);
}

/** Deterministic fixtures for UI development and tests. Not live market data. */
export class MockDataProvider implements StockDataProvider {
  async getManifest() {
    return getBuiltMock().manifest;
  }

  async getMarketOverview() {
    return getBuiltMock().overview;
  }

  async getUniverse() {
    return getBuiltMock().stocks.map((stock) => stock.summary);
  }

  async getScreener() {
    return getBuiltMock().stocks.map((stock) => stock.screener);
  }

  async getStockSummary(ticker: string) {
    return this.require(ticker).summary;
  }

  async getStockTechnicals(ticker: string) {
    return this.require(ticker).detail;
  }

  async getStockHistory(ticker: string, range?: ChartRange) {
    return sliceHistory(this.require(ticker).history, range);
  }

  private require(ticker: string) {
    const stock = getBuiltMock().byTicker.get(ticker.toUpperCase());
    if (!stock) {
      throw new ProviderError('NOT_FOUND', `No illustrated stock for ${ticker.toUpperCase()}.`);
    }
    return stock;
  }
}
