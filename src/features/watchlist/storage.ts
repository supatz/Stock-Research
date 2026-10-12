export const WATCHLIST_KEY = 'meridian.watchlist';

export function readWatchlist(storage: Storage = localStorage): string[] {
  try {
    const raw = storage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const tickers = parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.toUpperCase());
    return [...new Set(tickers)];
  } catch {
    return [];
  }
}

export function writeWatchlist(tickers: string[], storage: Storage = localStorage): void {
  storage.setItem(WATCHLIST_KEY, JSON.stringify(tickers));
}
