/**
 * Stable page and section reference IDs.
 *
 * Add a section by adding a key here, then render SectionHeader or ReferenceTag
 * with that id. Clipboard text is built only from this registry so visible
 * labels and copied references cannot drift apart.
 *
 * Deferred areas (ownership, fundamentals, India, options) stay documented in
 * Instruction Files/COMING_NEXT.md and are represented only as Extras placeholders.
 */
export const REFERENCE_REGISTRY = {
  'page.market': { name: 'Market' },
  'section.market.regime': { name: 'Market Regime', page: 'Market' },
  'section.market.indices': { name: 'Major Indices', page: 'Market' },
  'section.market.sectors': { name: 'Sector Leadership', page: 'Market' },
  'section.market.breadth': { name: 'Breadth', page: 'Market' },
  'page.screener': { name: 'Screener' },
  'section.screener.filters': { name: 'Filters', page: 'Screener' },
  'section.screener.results': { name: 'Results', page: 'Screener' },
  'page.stock': { name: 'Stock Detail' },
  'section.stock.header': { name: 'Company Header', page: 'Stock Detail' },
  'section.stock.research-brief': { name: 'Research Brief', page: 'Stock Detail' },
  'section.stock.snapshot': { name: 'Technical Snapshot', page: 'Stock Detail' },
  'section.stock.chart': { name: 'Main Chart', page: 'Stock Detail' },
  'section.stock.key-statistics': { name: 'Key Statistics', page: 'Stock Detail' },
  'section.stock.price-performance': { name: 'Price Performance', page: 'Stock Detail' },
  'section.stock.financials': { name: 'Financial Details', page: 'Stock Detail' },
  'section.stock.trend': { name: 'Trend', page: 'Stock Detail' },
  'section.stock.momentum': { name: 'Momentum', page: 'Stock Detail' },
  'section.stock.relative-strength': { name: 'Relative Strength', page: 'Stock Detail' },
  'section.stock.volatility': { name: 'Volatility & Risk', page: 'Stock Detail' },
  'section.stock.volume': { name: 'Volume & Participation', page: 'Stock Detail' },
  'section.stock.price-structure': { name: 'Price Structure', page: 'Stock Detail' },
  'section.stock.market-context': { name: 'Market Context', page: 'Stock Detail' },
  'page.watchlist': { name: 'Watchlist' },
  'section.watchlist.manager': { name: 'Watchlist Manager', page: 'Watchlist' },
  'section.watchlist.table': { name: 'Tracked Names', page: 'Watchlist' },
  'page.extras': { name: 'Extras' },
  'section.extras.ownership': { name: 'Ownership & Positioning', page: 'Extras' },
  'section.extras.form4': { name: 'Insider Transactions', page: 'Extras' },
  'section.extras.13f': { name: 'Institutional Holdings', page: 'Extras' },
  'section.extras.13dg': { name: 'Major Ownership Changes', page: 'Extras' },
  'section.extras.experimental': { name: 'Experimental Technical Indicators', page: 'Extras' },
} as const;

export type ReferenceId = keyof typeof REFERENCE_REGISTRY;

export function referenceLabel(id: ReferenceId): string {
  const entry = REFERENCE_REGISTRY[id];
  return 'page' in entry ? `${entry.page} / ${entry.name}` : entry.name;
}

/** Clipboard payload: `Stock Detail / Trend [section.stock.trend]`. */
export function referenceCopy(id: ReferenceId): string {
  return `${referenceLabel(id)} [${id}]`;
}

export function referenceAccessibleName(id: ReferenceId): string {
  const entry = REFERENCE_REGISTRY[id];
  const kind = 'page' in entry ? 'section' : 'page';
  return `Copy ${kind} reference for ${referenceLabel(id)}`;
}
