import type { StockDataProvider } from '@/data/providers/StockDataProvider';
import { MockDataProvider } from '@/data/providers/MockDataProvider';
import { StaticSnapshotDataProvider } from '@/data/providers/StaticSnapshotDataProvider';

export function createStockDataProvider(): StockDataProvider {
  // Netlify sets VITE_DATA_MODE=snapshot for the site build. Vitest inherits that
  // env and has no /data/v1 server, so tests always use the mock provider.
  if (import.meta.env.MODE === 'test') {
    return new MockDataProvider();
  }
  const mode = import.meta.env.VITE_DATA_MODE ?? 'snapshot';
  if (mode === 'snapshot') {
    return new StaticSnapshotDataProvider();
  }
  return new MockDataProvider();
}
