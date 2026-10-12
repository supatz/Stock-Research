import { useMemo, useState } from 'react';
import { flexRender, type ColumnVisibilityState, type SortingState } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy';
import { useSearchParams } from 'react-router';
import { useStockDataProvider } from '@/app/providers';
import { SignedValue } from '@/components/data-display/SignedValue';
import { StateBadge } from '@/components/data-display/StateBadge';
import { StockTickerLink } from '@/components/data-display/StockTickerLink';
import { ErrorState, EmptyState } from '@/components/feedback/States';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { PageHeader, SectionHeader } from '@/components/layout/SectionHeader';
import { SECTORS } from '@/domain/config';
import { formatMarketCap, formatMultiple, formatNumber, formatPercent, formatPrice } from '@/domain/metrics/format';
import { presentationForState } from '@/domain/metrics/labels';
import type { ScreenerRow } from '@/domain/types';
import {
  DEFAULT_SCREENER_FILTERS,
  filterScreenerRows,
  filtersAreDefault,
  filtersFromParams,
  paramsFromFilters,
  type ScreenerFilters,
} from '@/features/screener/filters';
import { useAsync } from '@/lib/useAsync';

function nullSort(rowA: { getValue: (id: string) => unknown }, rowB: { getValue: (id: string) => unknown }, columnId: string) {
  const a = rowA.getValue(columnId);
  const b = rowB.getValue(columnId);
  if (typeof a !== 'number' && typeof b !== 'number') return 0;
  if (typeof a !== 'number') return 1;
  if (typeof b !== 'number') return -1;
  return a === b ? 0 : a > b ? 1 : -1;
}

const COLUMNS: LegacyColumnDef<ScreenerRow>[] = [
  {
    accessorKey: 'ticker',
    header: 'Ticker',
    enableHiding: false,
    cell: ({ row }) => (
      <span className="identity">
        <StockTickerLink ticker={row.original.ticker} />
        {row.original.quality !== 'good' ? <span className="flag">{row.original.quality}</span> : null}
      </span>
    ),
  },
  {
    accessorKey: 'company',
    header: 'Company',
    enableHiding: false,
  },
  { accessorKey: 'sector', header: 'Sector' },
  {
    accessorKey: 'marketCap',
    header: 'Market cap',
    cell: ({ getValue }) => formatMarketCap(getValue<number>()),
    meta: { numeric: true },
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ getValue }) => formatPrice(getValue<number>()),
    meta: { numeric: true },
  },
  {
    accessorKey: 'return1m',
    header: '1M return',
    cell: ({ getValue }) => <SignedValue value={getValue<number | null>()} />,
    sortFn: nullSort,
    meta: { numeric: true },
  },
  {
    accessorKey: 'rs6mVsSpy',
    header: '6M vs SPY',
    cell: ({ getValue }) => <SignedValue value={getValue<number | null>()} />,
    sortFn: nullSort,
    meta: { numeric: true },
  },
  {
    accessorKey: 'trendState',
    header: 'Trend state',
    cell: ({ getValue }) => <StateBadge state={String(getValue())} />,
  },
  {
    accessorKey: 'rsi',
    header: 'RSI',
    cell: ({ getValue }) => formatNumber(getValue<number>(), 1),
    meta: { numeric: true },
  },
  {
    accessorKey: 'adx',
    header: 'ADX',
    cell: ({ getValue }) => formatNumber(getValue<number>(), 1),
    meta: { numeric: true },
  },
  {
    accessorKey: 'atrPct',
    header: 'ATR %',
    cell: ({ getValue }) => formatPercent(getValue<number | null>(), 1, false),
    sortFn: nullSort,
    meta: { numeric: true },
  },
  {
    accessorKey: 'rvol',
    header: 'RVOL',
    cell: ({ getValue }) => formatMultiple(getValue<number>()),
    meta: { numeric: true },
  },
  {
    accessorKey: 'distance52wHigh',
    header: 'Distance from 52W high',
    cell: ({ getValue }) => <SignedValue value={getValue<number | null>()} />,
    sortFn: nullSort,
    meta: { numeric: true },
  },
];

export default function ScreenerPage() {
  const provider = useStockDataProvider();
  const loaded = useAsync(() => provider.getScreener(), [provider]);
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'marketCap', desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  const rows = useMemo(
    () => (loaded.data ? filterScreenerRows(loaded.data, filters) : []),
    [loaded.data, filters],
  );

  const table = useLegacyTable({
    data: rows,
    columns: COLUMNS,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 12 } },
  });

  function update(patch: Partial<ScreenerFilters>) {
    const next = { ...filters, ...patch };
    setParams(paramsFromFilters(next), { replace: true });
    table.setPageIndex(0);
  }

  if (loaded.status === 'loading') return <PageSkeleton label="Loading screener" />;
  if (loaded.status === 'error' || !loaded.data) {
    return <ErrorState title="Screener is unavailable" message={loaded.message ?? 'The snapshot could not be read.'} />;
  }

  const pageRows = table.getRowModel().rows;

  return (
    <div className="stack">
      <PageHeader referenceId="page.screener" kicker="Illustrated US large and mega caps">
        <p className="lede">Filter the demo universe by trend, momentum, relative strength, and risk. Results stay descriptive. Nothing here is a buy rating.</p>
      </PageHeader>

      <section id="section.screener.filters" className="section-block" aria-labelledby="section.screener.filters-title">
        <SectionHeader
          referenceId="section.screener.filters"
          actions={filtersAreDefault(filters) ? null : (
            <button type="button" className="text-button" onClick={() => update(DEFAULT_SCREENER_FILTERS)}>
              Clear filters
            </button>
          )}
        />
        <form className="filter-grid" aria-label="Screener filters" onSubmit={(event) => event.preventDefault()}>
          <label className="field field-wide">
            <span>Ticker or company</span>
            <input value={filters.query} onChange={(event) => update({ query: event.target.value })} />
          </label>
          <label className="field">
            <span>Sector</span>
            <select value={filters.sector} onChange={(event) => update({ sector: event.target.value as ScreenerFilters['sector'] })}>
              <option value="all">All sectors</option>
              {SECTORS.map((sector) => <option key={sector.id} value={sector.id}>{sector.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Cap tier</span>
            <select value={filters.capTier} onChange={(event) => update({ capTier: event.target.value as ScreenerFilters['capTier'] })}>
              <option value="all">Mega and large</option>
              <option value="mega">Mega cap</option>
              <option value="large">Large cap</option>
            </select>
          </label>
          <label className="field">
            <span>Trend state</span>
            <select value={filters.trend} onChange={(event) => update({ trend: event.target.value as ScreenerFilters['trend'] })}>
              <option value="all">Any trend</option>
              {['STRONG_UPTREND', 'UPTREND', 'MIXED', 'DOWNTREND', 'STRONG_DOWNTREND', 'INSUFFICIENT'].map((state) => (
                <option key={state} value={state}>{presentationForState(state).label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Relative strength</span>
            <select value={filters.rs} onChange={(event) => update({ rs: event.target.value as ScreenerFilters['rs'] })}>
              <option value="all">Any state</option>
              {['LEADING_MARKET_AND_SECTOR', 'LEADING_MARKET', 'LEADING_SECTOR', 'IN_LINE', 'LAGGING', 'INSUFFICIENT'].map((state) => (
                <option key={state} value={state}>{presentationForState(state).label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>RSI minimum</span>
            <input type="number" min={0} max={100} value={filters.rsiMin} onChange={(event) => update({ rsiMin: Number(event.target.value) })} />
          </label>
          <label className="field">
            <span>RSI maximum</span>
            <input type="number" min={0} max={100} value={filters.rsiMax} onChange={(event) => update({ rsiMax: Number(event.target.value) })} />
          </label>
          <label className="field">
            <span>ATR % percentile minimum</span>
            <input type="number" min={0} max={100} value={filters.atrMin} onChange={(event) => update({ atrMin: Number(event.target.value) })} />
          </label>
          <label className="field">
            <span>ATR % percentile maximum</span>
            <input type="number" min={0} max={100} value={filters.atrMax} onChange={(event) => update({ atrMax: Number(event.target.value) })} />
          </label>
          <label className="field">
            <span>RVOL threshold</span>
            <select value={filters.rvolMin ?? ''} onChange={(event) => update({ rvolMin: event.target.value === '' ? null : Number(event.target.value) })}>
              <option value="">Any participation</option>
              <option value="0.75">At least 0.75×</option>
              <option value="1.25">At least 1.25×</option>
              <option value="2">At least 2×</option>
            </select>
          </label>
          <label className="field">
            <span>Distance from 52W high</span>
            <select
              value={filters.maxDistanceFromHigh ?? ''}
              onChange={(event) => update({ maxDistanceFromHigh: event.target.value === '' ? null : Number(event.target.value) })}
            >
              <option value="">Any distance</option>
              <option value="5">Within 5%</option>
              <option value="10">Within 10%</option>
              <option value="20">Within 20%</option>
            </select>
          </label>
        </form>
      </section>

      <section id="section.screener.results" className="section-block" aria-labelledby="section.screener.results-title">
        <SectionHeader
          referenceId="section.screener.results"
          description={`${rows.length} ${rows.length === 1 ? 'name matches' : 'names match'}. Sorted columns stay visible in the header.`}
          actions={
            <details className="chooser">
              <summary>Columns</summary>
              <div className="chooser-list">
                {table.getAllLeafColumns().filter((column) => column.getCanHide()).map((column) => (
                  <label key={column.id}>
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                    />
                    {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                  </label>
                ))}
              </div>
            </details>
          }
        />
        {rows.length === 0 ? (
          <EmptyState
            title="No names match"
            message="Widen a range or clear the filters to see the illustrated universe again."
            action={<button type="button" className="text-button" onClick={() => update(DEFAULT_SCREENER_FILTERS)}>Clear filters</button>}
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table screener-table">
                <caption className="sr-only">Screener results</caption>
                <thead>
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => {
                        const sorted = header.column.getIsSorted();
                        return (
                          <th
                            key={header.id}
                            scope="col"
                            aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                            className={header.column.columnDef.meta && 'numeric' in header.column.columnDef.meta ? 'num-col' : undefined}
                          >
                            {header.isPlaceholder ? null : (
                              <button type="button" className="sort-button" onClick={header.column.getToggleSortingHandler()}>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                <span aria-hidden="true">{sorted === 'asc' ? ' ▲' : sorted === 'desc' ? ' ▼' : ''}</span>
                              </button>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cell.column.columnDef.meta && 'numeric' in cell.column.columnDef.meta ? 'num-col' : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="screener-cards">
              {pageRows.map((row) => (
                <article key={row.id} className="result-card">
                  <div className="result-card-top">
                    <StockTickerLink ticker={row.original.ticker} />
                    <span>{row.original.company}</span>
                  </div>
                  <p>{row.original.sector} · {row.original.capTier === 'mega' ? 'Mega cap' : 'Large cap'} · {formatMarketCap(row.original.marketCap)}</p>
                  <p><SignedValue value={row.original.return1m} /> 1M · <SignedValue value={row.original.rs6mVsSpy} /> 6M vs SPY</p>
                  <StateBadge state={row.original.trendState} />
                  <p>RSI {formatNumber(row.original.rsi, 1)} · ATR {formatPercent(row.original.atrPct, 1, false)} · RVOL {formatMultiple(row.original.rvol)}</p>
                </article>
              ))}
            </div>
            <div className="pager">
              <button type="button" className="text-button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Previous
              </button>
              <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
              <button type="button" className="text-button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
