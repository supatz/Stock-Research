import { beforeEach, describe, expect, it } from 'vitest';
import { readWatchlist, writeWatchlist } from '@/features/watchlist/storage';

describe('watchlist storage', () => {
  beforeEach(() => localStorage.clear());

  it('persists unique tickers and ignores corrupt storage', () => {
    expect(readWatchlist()).toEqual([]);
    writeWatchlist(['aapl', 'AAPL', 'msft']);
    expect(readWatchlist()).toEqual(['AAPL', 'MSFT']);
    localStorage.setItem('meridian.watchlist', '{');
    expect(readWatchlist()).toEqual([]);
  });
});
