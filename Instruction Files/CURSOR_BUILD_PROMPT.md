# Cursor Build Prompt — Personal Stock Market Analysis Site

You are a senior frontend engineer, product designer, data-visualization engineer, and quantitative-finance application architect.

Build a polished, production-quality V1 of a **personal stock market analysis website** focused initially on **US mega-cap and large-cap equities**. The site will later be hosted on **Netlify** and later expanded to fundamentals, other markets such as India, ownership data, options, and more.

Read and follow these project documents before coding:

1. `TECHNICAL_METRICS_SPEC.md`
2. `WEBSITE_DESIGN_GUIDELINES.md`
3. `DATA_ARCHITECTURE_AND_REPOS.md`
4. `COMING_NEXT.md`

If any implementation choice conflicts with those documents, the metric specification and design guidelines take priority for V1.

---

# 1. Product goal

Create a research dashboard that lets a user quickly understand:

- what a stock is doing technically
- how unusual the current readings are for that same stock
- how the stock compares with relevant sector peers
- how the stock compares with the US large/mega-cap universe
- whether it is outperforming SPY and its sector benchmark
- what the current market regime looks like
- how to interpret every number displayed

The application must be **explainable**. Do not build a black-box "Strong Buy" score.

---

# 2. V1 scope

Market:
- United States

Universe:
- Mega cap: configurable, initial default >= $200B
- Large cap: configurable, initial default $10B–$200B

Frequency:
- Daily / end-of-day

Primary pages:
1. Market
2. Screener
3. Stock Detail
4. Watchlist
5. Extras

Do not build fundamentals yet.

Do not build insider/13F/13D/13G functionality yet; create the Extras structure/placeholders only and document that it is deferred.

---

# 3. Recommended frontend stack

Use a stack optimized for a fast Netlify-hosted dashboard:

- React
- TypeScript with strict mode
- Vite
- Tailwind CSS
- accessible headless primitives such as Radix UI / shadcn-compatible patterns where useful
- TanStack Table for screener/watchlist tables
- TradingView Lightweight Charts or another lightweight financial-chart library for candlestick charts
- Vitest + React Testing Library
- Playwright for a small number of critical end-to-end flows if practical

Do not add dependencies without a clear purpose.

If the repo already has an established equivalent stack, adapt rather than rewriting everything unnecessarily.

---

# 4. Architecture constraint: separate UI from finance calculations

Treat `DATA_ARCHITECTURE_AND_REPOS.md` as the authoritative implementation guide for repository selection, Python data ingestion, snapshot generation, Netlify integration, secrets, scheduling, provenance, and the future API migration path.


The eventual analytics engine will be Python-based and may use FinanceToolkit and other providers.

Do **not** implement core financial calculations directly inside React components.

For V1:
- build a typed data-provider interface
- provide deterministic realistic mock fixtures
- make it easy to replace the mock provider with generated JSON/API output later

Suggested structure:

```text
src/
  app/
  components/
    charts/
    data-display/
    feedback/
    layout/
    metrics/
  features/
    market/
    screener/
    stock/
    watchlist/
    extras/
  data/
    mock/
    providers/
  domain/
    metrics/
    stocks/
    market/
  lib/
  styles/
```

Create a provider contract such as:

```ts
interface MarketDataProvider {
  getMarketOverview(): Promise<MarketOverview>;
  getUniverse(): Promise<StockSummary[]>;
  getStock(ticker: string): Promise<StockDetail>;
  getStockHistory(ticker: string, range: string): Promise<OHLCVPoint[]>;
}
```

The UI must not care whether the data came from a mock fixture, JSON artifact, or future API.

---

# 5. Required finance data model

Implement the normalized metric record described in `TECHNICAL_METRICS_SPEC.md`.

Every metric should support, when applicable:
- raw value
- historical percentile
- sector-relative percentile
- market-relative percentile
- interpretation state
- cohort label
- sample size
- as-of date
- data-quality state

Do not treat a percentile as a quality score.

Each metric has a metadata definition containing at least:

```ts
interface MetricDefinition {
  id: string;
  label: string;
  dimension: string;
  unit?: string;
  comparisonPolicy: string;
  interpretationMode: string;
  precision: number;
  help: MetricHelp;
}
```

Centralize metric definitions; do not scatter interpretation logic across components.

---

# 6. Percentile / peer comparison requirement

This requirement is critical.

Keep the four-view model:
1. Raw
2. Historical
3. Sector
4. Market

But the underlying cohort must be metric-aware.

The UI must show what population was used.

Example:

```text
Sector percentile
76th
Technology / Large Cap
n=47
```

Implement sample-size metadata and fallback labels.

The mock dataset should include examples where:
- a percentile is high and positive (relative strength)
- a percentile is high but risk-oriented (ATR %)
- a percentile is high but ambiguous/contextual (RSI)
- a peer cohort falls back from sector+size to sector
- historical data is insufficient for at least one stock/metric

This ensures the design handles real-world edge cases.

---

# 7. Technical dimensions

Implement V1 around these dimensions:

1. Price Performance
2. Trend
3. Momentum
4. Relative Strength
5. Volatility & Risk
6. Volume & Participation
7. Price Structure
8. Market Context

Use the exact V1 metrics and interpretation guidance in `TECHNICAL_METRICS_SPEC.md`.

Do not add dozens of extra indicators merely because a charting library provides them.

---

# 8. Global layout

Create a professional app shell.

Required:
- desktop navigation
- responsive mobile navigation
- persistent global ticker search / stock switcher
- theme support: light + dark
- data freshness indicator
- keyboard-friendly controls

The design should feel like a modern professional research product, not a retail trading casino.

Avoid:
- flashing colors
- oversized green/red percentages everywhere
- giant gauges
- excessive gradients
- neon trading-terminal styling
- gamification

---

# 9. Mandatory page / section reference system

This is one of the most important product requirements because the user will iterate on the website through chat.

Every page and every meaningful section must have:
- a visible human-readable name
- a stable reference ID in code
- a reusable `ReferenceTag` / reference control

Example IDs:

```text
page.market
section.market.regime
section.market.sectors
page.screener
section.screener.filters
section.screener.results
page.stock
section.stock.snapshot
section.stock.chart
section.stock.trend
section.stock.momentum
section.stock.relative-strength
section.stock.volatility
section.stock.volume
section.stock.price-structure
section.stock.market-context
page.watchlist
page.extras
section.extras.ownership
```

### Reference interaction

A small `i` icon should appear next to a page/section heading when the heading area is hovered or keyboard-focused.

On mobile, do not depend on hover.

Clicking the `i` icon copies:

```text
Stock Detail / Trend [section.stock.trend]
```

Show a toast:

```text
Copied: Stock Detail / Trend [section.stock.trend]
```

Make the icon accessible:

```text
aria-label="Copy section reference for Stock Detail / Trend"
```

Create this as a reusable component and use it everywhere.

---

# 10. Metric education / help requirement

Every metric shown to the user must have a `?` help affordance.

The help must explain:
- what the metric is
- how to read it
- what to compare it with
- relevant thresholds/ranges
- caveats
- an example where useful

Example: MA Alignment help should explain why `Price > SMA20 > SMA50 > SMA200` represents a clean upward alignment and why moving averages are lagging indicators.

Short help can use an accessible popover/tooltip pattern.

Longer help must use a popover, drawer, or dialog that supports focus properly. Do not put interactive content inside a pure tooltip.

The help experience must work with mouse, keyboard and touch.

---

# 11. Market page

Reference: `page.market`

Build the following sections.

## Market Regime
Reference: `section.market.regime`

Show:
- derived regime label
- SPY vs 50DMA
- SPY vs 200DMA
- QQQ vs 200DMA
- % universe above 50DMA
- % universe above 200DMA
- VIX and historical percentile if mock data includes it

Use a concise market-state summary and metric cards.

## Major Indices
Reference: `section.market.indices`

Show compact cards for:
- SPY
- QQQ
- DIA optional
- IWM optional/contextual

## Sector Leadership
Reference: `section.market.sectors`

Show 11 US sector ETFs with:
- daily return
- 1M return
- 3M relative strength vs SPY
- trend state

Use a clean ranked list or heatmap-like table; do not rely on color alone.

## Breadth
Reference: `section.market.breadth`

Show:
- % above 50DMA
- % above 200DMA
- new 20D highs / lows if present in mock data

---

# 12. Screener page

Reference: `page.screener`

## Filter bar
Reference: `section.screener.filters`

Initial filters:
- ticker/company search
- sector
- cap tier
- trend state
- RSI range
- relative-strength state
- ATR % percentile range
- RVOL threshold
- distance from 52W high

## Results
Reference: `section.screener.results`

Use TanStack Table.

Default columns:
- Ticker
- Company
- Sector
- Market Cap
- Price
- 1M Return
- 6M vs SPY
- Trend State
- RSI
- ADX
- ATR %
- RVOL
- Distance from 52W High

Requirements:
- sorting
- column visibility chooser
- sticky header
- sticky ticker/company column on desktop
- pagination or virtualization depending on size
- click ticker to open stock detail
- URL query state for filters where reasonable

Create at least 25–40 realistic mock securities across multiple sectors so the screener feels real.

---

# 13. Stock Detail page

Reference: `page.stock`

Use a route such as:

```text
/stocks/:ticker
```

Build the following sections.

## Company Header
Reference: `section.stock.header`

Show:
- ticker
- company
- sector
- cap tier
- price
- daily change
- market cap
- as-of time

## Technical Snapshot
Reference: `section.stock.snapshot`

Create the six-dimension state ribbon:
- Trend
- Momentum
- Relative Strength
- Volatility / Risk
- Volume / Participation
- Market Context

Do not collapse this into a single score.

Clicking a state scrolls to its section.

## Main Chart
Reference: `section.stock.chart`

Show:
- candlesticks
- volume
- SMA20 toggle
- SMA50 toggle
- SMA200 toggle
- range controls

Keep chart defaults clean.

## Price Performance
Reference: `section.stock.price-performance`

Show 1D, 5D, 1M, 3M, 6M, YTD, 1Y and 52W-high distance.

## Trend
Reference: `section.stock.trend`

Show:
- moving-average alignment
- SMA20/50/200
- distance from each
- slopes / state
- ADX

Include a compact visual Trend Stack if practical.

## Momentum
Reference: `section.stock.momentum`

Show:
- RSI 14
- MACD / Signal / Histogram
- ROC 20D
- ROC 63D

## Relative Strength
Reference: `section.stock.relative-strength`

Show a matrix:
- columns: 1M / 3M / 6M / 12M
- rows: vs SPY / vs sector ETF

Show derived state.

## Volatility & Risk
Reference: `section.stock.volatility`

Show:
- ATR %
- 20D realized volatility
- 60D realized volatility
- Bollinger width
- current drawdown
- 1Y max drawdown

Use neutral/risk language, not "good/bad".

## Volume & Participation
Reference: `section.stock.volume`

Show:
- daily volume
- 20D avg volume
- RVOL
- 20D avg dollar volume
- CMF 20D

## Price Structure
Reference: `section.stock.price-structure`

Show:
- distance from 52W high
- distance from 52W low
- 20D high/low status
- 55D high/low status
- breakout + volume confirmation if present

## Market Context
Reference: `section.stock.market-context`

Show relevant global market regime and sector context without duplicating the entire Market page.

---

# 14. Four-view MetricCard component

Build one reusable component to display a metric consistently.

Suggested API:

```tsx
<MetricCard
  definition={metricDefinition}
  observation={metricObservation}
  variant="default"
/>
```

Card content:
- metric label
- `?` help
- raw value
- interpretation state
- historical percentile
- sector percentile
- market percentile
- cohort/sample-size detail
- missing/stale status

Use compact percentile rails/dots.

Do not use giant radial gauges.

---

# 15. Watchlist page

Reference: `page.watchlist`

For V1, store watchlist tickers in localStorage.

Features:
- add/remove ticker
- compact table of tracked tickers
- key state labels
- 1D/1M performance
- relative strength
- trend
- RSI
- ATR %
- latest as-of date

Make state changes visually easy to scan.

Do not implement alerts yet.

---

# 16. Extras page

Reference: `page.extras`

Build polished "coming later" cards, not dead empty placeholders.

Sections:
- Ownership & Positioning
- Insider Transactions (Form 4)
- Institutional Holdings (13F)
- Major Ownership Changes (13D/13G)
- Experimental Technical Indicators

Reference the future plan from `COMING_NEXT.md` in developer comments/documentation, but do not implement live SEC data yet.

---

# 17. Mock data requirements

Create deterministic mock data that makes the UI testable.

At minimum include representative stocks such as:
- AAPL
- MSFT
- NVDA
- AMZN
- GOOGL
- META
- JPM
- V
- UNH or another large Health Care name
- XOM
- COST
- HD
- CAT
- NEE
- LIN or another Materials name
- one or more REITs

Expand to at least 25–40 rows across sectors for the screener.

Mock states should intentionally vary:
- strong trend / weak trend
- high RSI / low RSI
- high ATR percentile
- quiet volatility
- high RVOL
- strong vs SPY but weak vs sector
- weak vs SPY but strong vs sector
- near 52W high
- deep drawdown
- insufficient history
- stale/partial data example

Do not use random values at runtime. Fixtures must be deterministic so screenshots/tests are stable.

---

# 18. Accessibility requirements

Target WCAG 2.2 AA.

At minimum:
- semantic landmarks
- logical headings
- keyboard-operable controls
- visible focus
- accessible names for icon buttons
- no color-only meaning
- reduced-motion support
- screen-reader text summaries for charts
- sufficient control target size / spacing
- `i` reference controls and `?` help controls usable without hover

Run an accessibility check in development if tooling is available.

---

# 19. Performance requirements

Design toward Core Web Vitals goals:
- LCP <= 2.5s
- INP <= 200ms
- CLS <= 0.1

Practices:
- route-level code splitting
- lazy-load heavy charts below the fold
- do not calculate the full universe in render loops
- memoize derived presentation data when needed
- reserve chart/layout dimensions
- avoid huge client-side JSON payloads

---

# 20. Data / secret hygiene

Even though V1 uses mocks, prepare for future providers.

Rules:
- no API keys committed to source
- no provider secret in frontend bundle
- `.env.example` only contains placeholder names
- future FinanceToolkit/FMP access occurs in a Python batch/backend environment, not in browser code

---

# 21. Testing

Write tests for the most important reusable logic/components.

Required unit/component test coverage areas:
- percentile formatting
- unavailable percentile state
- cohort/sample-size display
- interpretation state display
- ReferenceTag clipboard string generation
- MetricHelp keyboard interaction
- screener filtering
- watchlist localStorage behavior

If Playwright is added, cover at least:
1. open screener → click ticker → stock page
2. click a section reference icon → clipboard/toast
3. keyboard-open metric help

---

# 22. Developer documentation

Create/update the project README with:
- what the project is
- install commands
- local development
- build command
- Netlify deployment notes
- architecture overview
- mock-data provider explanation
- how to add a new metric
- how to add a new section reference ID
- future Python data-pipeline integration point

Create a central registry/document for all stable page/section IDs so duplicates do not emerge.

---

# 23. Quality bar

The first build should already feel coherent and intentional.

Success means:
- the user can understand the stock's state in <10 seconds
- deeper detail is available without cluttering the default view
- every metric can explain itself
- every section can be referenced/copied for iterative development
- percentile context never hides its cohort/sample size
- high percentile is not automatically styled as positive
- the screener is useful rather than decorative
- mobile remains functional
- the codebase is modular enough to replace mocks with real finance data later

---

# 24. Implementation sequence

Use this order unless the existing repo structure strongly suggests otherwise:

1. Inspect existing repository and preserve good existing conventions.
2. Set up theme/design tokens and app shell.
3. Implement domain types and metric registry.
4. Implement deterministic mock provider.
5. Implement reusable primitives: SectionHeader, ReferenceTag, MetricHelp, MetricCard, PercentileRail, StateBadge, DataTimestamp.
6. Build Stock Detail first because it defines the core visual language.
7. Build Market.
8. Build Screener.
9. Build Watchlist.
10. Build Extras.
11. Add responsive behavior.
12. Add accessibility pass.
13. Add tests.
14. Run production build and fix warnings/errors.
15. Update README.

Do not stop after scaffolding. Complete a functional, polished V1 using the mock provider.

---

# 25. Final self-review before declaring completion

Verify all of the following:

- [ ] Every primary page has a stable reference ID.
- [ ] Every meaningful section has a stable reference ID.
- [ ] Hover/focus reveals the section `i` reference control.
- [ ] Clicking it copies `Page / Section [reference.id]`.
- [ ] Every metric has accessible `?` help.
- [ ] No metric calls a high percentile automatically good.
- [ ] Percentile cards show cohort labels and sample size.
- [ ] Trend, Momentum, Relative Strength, Volatility, Volume and Market Context are visible as separate states.
- [ ] There is no single Strong Buy score.
- [ ] Screener filters/sorts work.
- [ ] Watchlist persists locally.
- [ ] Mobile does not depend on hover.
- [ ] Keyboard navigation works.
- [ ] Missing/stale/insufficient data has explicit states.
- [ ] Production build succeeds.
- [ ] No secrets are bundled.
- [ ] README explains the architecture and how to extend it.

When done, provide a concise implementation summary, a list of important files created/changed, and any known limitations. Do not claim that mock financial values are live market data.
