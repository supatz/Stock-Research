import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { StockSummary } from '@/domain/types';

export function StockSearch({ stocks }: { stocks: StockSummary[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const source = needle
      ? stocks.filter((stock) => stock.ticker.toLowerCase().includes(needle) || stock.company.toLowerCase().includes(needle))
      : stocks;
    return source.slice(0, 8);
  }, [query, stocks]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, []);

  function choose(ticker: string) {
    setQuery('');
    setOpen(false);
    navigate(`/stocks/${ticker}`);
  }

  return (
    <div className="search" ref={rootRef}>
      <label className="sr-only" htmlFor="stock-search">Search stocks</label>
      <input
        id="stock-search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].ticker}` : undefined}
        placeholder="Search ticker or company"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter') {
            const match = matches[active];
            if (open && match) {
              event.preventDefault();
              choose(match.ticker);
            }
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && matches.length > 0 ? (
        <ul id={listId} role="listbox" className="search-list">
          {matches.map((stock, index) => (
            <li key={stock.ticker} role="presentation">
              <button
                id={`${listId}-${stock.ticker}`}
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? 'is-active' : undefined}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(stock.ticker)}
              >
                <span className="ticker">{stock.ticker}</span>
                <span>{stock.company}</span>
                <span className="muted">{stock.sector}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && query.trim() && matches.length === 0 ? (
        <p className="search-empty" role="status">No illustrated name matches that search.</p>
      ) : null}
    </div>
  );
}
