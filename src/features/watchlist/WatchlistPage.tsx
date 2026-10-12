import { useMemo, useState, type FormEvent } from 'react';
import { useStockDataProvider, useToast, useWatchlist } from '@/app/providers';
import { DataTimestamp } from '@/components/data-display/DataTimestamp';
import { SignedValue } from '@/components/data-display/SignedValue';
import { StateBadge } from '@/components/data-display/StateBadge';
import { StockTickerLink } from '@/components/data-display/StockTickerLink';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageHeader, SectionHeader } from '@/components/layout/SectionHeader';
import { formatMultiple, formatNumber, formatPercent } from '@/domain/metrics/format';
import type { StockSummary } from '@/domain/types';
import { useAsync } from '@/lib/useAsync';

export default function WatchlistPage() {
  const provider = useStockDataProvider();
  const universe = useAsync(() => provider.getUniverse(), [provider]);
  const { tickers, addTicker, removeTicker } = useWatchlist();
  const { pushToast } = useToast();
  const [draft, setDraft] = useState('');

  const byTicker = useMemo(() => {
    const map = new Map<string, StockSummary>();
    for (const stock of universe.data ?? []) map.set(stock.ticker, stock);
    return map;
  }, [universe.data]);

  function onAdd(event: FormEvent) {
    event.preventDefault();
    const ticker = draft.trim().toUpperCase();
    if (!ticker) return;
    if (!byTicker.has(ticker)) {
      pushToast(`${ticker} is not in the illustrated universe`);
      return;
    }
    const added = addTicker(ticker);
    pushToast(added ? `Added ${ticker} to the watchlist` : `${ticker} is already on the watchlist`);
    if (added) setDraft('');
  }

  if (universe.status === 'loading') return <PageSkeleton label="Loading watchlist" />;
  if (universe.status === 'error' || !universe.data) {
    return <ErrorState title="Watchlist data is unavailable" message={universe.message ?? 'The snapshot could not be read.'} />;
  }

  const rows = tickers.map((ticker) => byTicker.get(ticker)).filter((stock): stock is StockSummary => Boolean(stock));

  return (
    <div className="stack">
      <PageHeader referenceId="page.watchlist" kicker="Stored in this browser">
        <p className="lede">Track a short list of names. Alerts are not part of this version.</p>
      </PageHeader>

      <section id="section.watchlist.manager" className="section-block" aria-labelledby="section.watchlist.manager-title">
        <SectionHeader referenceId="section.watchlist.manager" description="Add a ticker from the illustrated universe. The list stays in local storage on this device." />
        <form className="watch-form" onSubmit={onAdd}>
          <label className="field" htmlFor="watchlist-ticker">
            <span>Add ticker</span>
            <input
              id="watchlist-ticker"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="AAPL"
              autoCapitalize="characters"
            />
          </label>
          <button type="submit" className="text-button">Add</button>
        </form>
      </section>

      <section id="section.watchlist.table" className="section-block" aria-labelledby="section.watchlist.table-title">
        <SectionHeader referenceId="section.watchlist.table" description={rows.length === 0 ? 'No names yet.' : `${rows.length} tracked ${rows.length === 1 ? 'name' : 'names'}.`} />
        {rows.length === 0 ? (
          <EmptyState
            title="The watchlist is empty"
            message="Add a ticker above, or use Add to watchlist on a stock page."
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">Tracked stocks</caption>
              <thead>
                <tr>
                  <th scope="col">Ticker</th>
                  <th scope="col">Company</th>
                  <th scope="col">1D</th>
                  <th scope="col">1M</th>
                  <th scope="col">Relative strength</th>
                  <th scope="col">Trend</th>
                  <th scope="col">RSI</th>
                  <th scope="col">ATR %</th>
                  <th scope="col">As of</th>
                  <th scope="col">Remove</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((stock) => (
                  <tr key={stock.ticker}>
                    <th scope="row"><StockTickerLink ticker={stock.ticker} /></th>
                    <td>{stock.company}</td>
                    <td><SignedValue value={stock.dailyChangePct} /></td>
                    <td><SignedValue value={stock.return1m} /></td>
                    <td><StateBadge state={stock.rsState} /></td>
                    <td><StateBadge state={stock.trendState} /></td>
                    <td className="num">{formatNumber(stock.rsi, 1)}</td>
                    <td className="num">{formatPercent(stock.atrPct, 1, false)}</td>
                    <td><DataTimestamp asOf={stock.asOf} stale={stock.quality === 'stale'} prefix="" /></td>
                    <td>
                      <button
                        type="button"
                        className="text-button"
                        aria-label={`Remove ${stock.ticker} from watchlist`}
                        onClick={() => {
                          removeTicker(stock.ticker);
                          pushToast(`Removed ${stock.ticker} from the watchlist`);
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows[0] ? <p className="muted">Latest tracked relative volume: {formatMultiple(rows[0].rvol)}. Read it with the day’s price direction on the stock page.</p> : null}
      </section>
    </div>
  );
}
