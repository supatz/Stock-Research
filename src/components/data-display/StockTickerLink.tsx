import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function StockTickerLink({ ticker, children }: { ticker: string; children?: ReactNode }) {
  return (
    <Link className="ticker-link" to={`/stocks/${ticker}`}>
      {children ?? ticker}
    </Link>
  );
}
