import type { StockDataProvider } from '@/data/providers/StockDataProvider';
import { MockDataProvider } from '@/data/providers/MockDataProvider';
import { StaticSnapshotDataProvider } from '@/data/providers/StaticSnapshotDataProvider';

export function createStockDataProvider(): StockDataProvider {
  const mode = import.meta.env.VITE_DATA_MODE ?? 'mock';
  if (mode === 'snapshot') {
    return new StaticSnapshotDataProvider();
  }
  return new MockDataProvider();
}
