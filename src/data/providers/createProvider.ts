import type { StockDataProvider } from '@/data/providers/StockDataProvider';
import { MockDataProvider } from '@/data/providers/MockDataProvider';
import { StaticSnapshotDataProvider } from '@/data/providers/StaticSnapshotDataProvider';

export function createStockDataProvider(): StockDataProvider {
  const configured = import.meta.env.VITE_DATA_MODE;
  // Vitest has no static /data/v1 server; default tests to mock unless overridden.
  const mode = configured ?? (import.meta.env.MODE === 'test' ? 'mock' : 'snapshot');
  if (mode === 'snapshot') {
    return new StaticSnapshotDataProvider();
  }
  return new MockDataProvider();
}
