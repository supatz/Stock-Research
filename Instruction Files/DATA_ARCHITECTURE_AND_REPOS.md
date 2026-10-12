# Data Architecture, Git Repositories, and Website Integration Instructions

## 1. Purpose

This document is the implementation guide for connecting the stock-analysis website to its data and analytics stack.

It answers five questions:

1. Which open-source repositories should be used?
2. What responsibility does each repository own?
3. Where should market data come from?
4. How should Python analytics connect to the React/Netlify website?
5. How should the architecture evolve later without forcing a rewrite?

This document is intentionally opinionated. Do not add overlapping finance libraries unless a documented requirement cannot be met by the selected stack.

---

# 2. Recommended architecture in one sentence

For V1, use a **build-time Python data pipeline** to fetch end-of-day data, calculate and normalize technical metrics, serialize versioned JSON snapshots, and let the React/Vite frontend read only those snapshots through a typed provider interface.

Do not make the browser fetch paid/private financial APIs directly.

Do not run FinanceToolkit calculations inside React.

Do not require a continuously running backend for V1.

---

# 3. Repository decisions

## 3.1 V1: use `JerBouma/FinanceToolkit`

Repository:
- https://github.com/JerBouma/FinanceToolkit

Role:
- primary technical-analysis calculation engine
- later financial-ratio/performance/risk engine
- standardized formulas and calculation methods

Use it for:
- moving averages
- RSI
- MACD
- ADX
- ATR
- Bollinger Bands
- OBV / CMF where required
- technical support calculations listed in `TECHNICAL_METRICS_SPEC.md`
- performance and risk calculations where the specification explicitly calls for them
- future fundamental calculations

Why:
- it already exposes the main technical indicators selected for this project
- calculation methods are transparent and centralized
- it also supports future fundamentals, risk, performance, options and economics
- it accepts custom historical data, so the application is not permanently tied to one market-data source

Implementation rule:
- install the released Python package from PyPI; do not copy FinanceToolkit source files into this project
- pin the package version after the first known-good implementation
- do not call FinanceToolkit from React/TypeScript

Python package:

```text
financetoolkit
```

License at the time this document was written:
- MIT

---

## 3.2 V1: use `JerBouma/FinanceDatabase`

Repository:
- https://github.com/JerBouma/FinanceDatabase

Role:
- security master / stock-universe metadata

Use it for:
- symbol discovery
- country
- exchange
- primary listing filtering
- sector
- industry
- market-cap classification where available
- later international-market expansion

Why:
- it complements FinanceToolkit
- its purpose is instrument metadata rather than live pricing
- it already covers US and international securities and therefore reduces future migration work when India or other markets are added

Important:
- do not treat FinanceDatabase as a live price or fundamentals source
- validate the active V1 universe against the market-data source before attempting calculations

Python package:

```text
financedatabase
```

License at the time this document was written:
- MIT

---

## 3.3 V1 market-data source: make the source swappable

The architecture must separate **data acquisition** from **analytics**.

Create a Python market-data adapter interface so that FinanceToolkit receives normalized OHLCV regardless of provider.

Suggested contract:

```python
class MarketDataSource(Protocol):
    def get_daily_history(
        self,
        tickers: list[str],
        start_date: date,
        end_date: date,
    ) -> pd.DataFrame: ...
```

Recommended V1 source priority:

### Preferred when an FMP subscription is available

Use Financial Modeling Prep through FinanceToolkit or an explicit provider adapter.

Advantages:
- more controlled API relationship
- FinanceToolkit is designed to work directly with FMP
- useful later for fundamentals

Tradeoff:
- request limits and plan coverage must be respected

### Personal prototype / fallback

Repository:
- https://github.com/ranaroussi/yfinance

Package:

```text
yfinance
```

Use for:
- batch end-of-day OHLCV during personal prototyping
- fallback where appropriate

Important:
- yfinance is an unofficial open-source client for Yahoo Finance
- Yahoo data usage is subject to Yahoo's terms; do not assume that a public deployment grants redistribution rights
- never call Yahoo Finance directly from the browser
- do not make yfinance the irreversible core of the architecture

FinanceToolkit itself can use Yahoo Finance as a fallback, and can also accept custom historical datasets. Preserve this flexibility.

---

## 3.4 Later / Extras: use `dgunning/edgartools`

Repository:
- https://github.com/dgunning/edgartools

Role:
- SEC filing and ownership-data ingestion

Use later for:
- Form 4 insider transactions
- 13F institutional holdings
- Schedule 13D / 13G ownership disclosures
- 10-K / 10-Q filings
- 8-K events
- XBRL/company facts

This belongs under `Extras` for now, as agreed in the product scope.

Do not install or wire it into the V1 production data refresh unless the Extras work is actively being implemented.

When enabled, set an SEC identity and respect SEC access requirements/rate limits.

Python package:

```text
edgartools
```

License at the time this document was written:
- MIT

---

## 3.5 Later: evaluate OpenBB as a provider integration layer

Repository family/project:
- https://github.com/OpenBB-finance/OpenBB

Role later:
- normalize access to multiple data providers if this application grows beyond a simple EOD equity workflow

Potential future use:
- multiple market-data vendors
- macro data
- options
- fixed income
- news
- broader international coverage

Do not introduce OpenBB into V1 simply because it exists. It adds an abstraction layer we do not yet need.

---

## 3.6 Reference only: `wilsonfreitas/awesome-quant`

Repository:
- https://github.com/wilsonfreitas/awesome-quant

Role:
- research catalogue
- future tool discovery

Do not add it as an application dependency.

Do not copy random indicator libraries from this list into V1 when FinanceToolkit already covers the requirement.

---

# 4. Dependency policy

The project should depend on capabilities, not GitHub source trees.

Use package managers and released packages where possible.

Recommended Python dependency structure:

```text
pipeline/
  pyproject.toml
  uv.lock                 # preferred, or a pinned requirements lock
```

Initial runtime packages will likely include:

```text
financetoolkit
financedatabase
pandas
numpy
pydantic
pyarrow          # useful for internal parquet/cache artifacts
# yfinance only if selected as the prototype market-data adapter
```

Deferred:

```text
edgartools
```

Pin exact versions after a green build and upgrade deliberately.

Do not install `TA-Lib`, `pandas-ta`, `ta`, and FinanceToolkit simultaneously unless a specific missing calculation has been documented.

---

# 5. V1 deployment architecture

## 5.1 Recommended topology

```text
                     Scheduled refresh
                           |
                           v
                 Netlify build / deploy
                           |
              +------------+-------------+
              |                          |
              v                          v
       Python data pipeline         React/Vite build
              |                          ^
              | writes                   |
              v                          |
       public/data/v1/*.json ------------+
              ^
              |
    +---------+----------+
    |                    |
    v                    v
Universe metadata     Market data
FinanceDatabase       FMP / Yahoo adapter
    |                    |
    +---------+----------+
              |
              v
       normalized OHLCV
              |
              v
       FinanceToolkit
              |
              v
 custom analytics layer
(percentiles / peer cohorts /
 derived states / provenance)
```

The browser never sees provider API keys.

The browser never performs the expensive analytical calculations.

The website receives a compact, deterministic snapshot.

---

# 6. Why build-time Python is preferred for V1

The site is initially end-of-day and personal-use. A continuously running API server would add infrastructure without adding meaningful product value.

Netlify's build environment supports Python, while the website itself remains a normal static React/Vite application.

Therefore V1 should:

1. execute the Python pipeline during a deployment build
2. write generated JSON into `public/data/`
3. run the Vite frontend build
4. publish both the frontend assets and generated data together as one immutable deploy

Benefits:
- simple operational model
- no public Python server
- no finance API secrets in the browser
- frontend and data snapshot deploy atomically
- a failed refresh does not need to replace the previous successful production deploy
- easy to replace with an API later because the frontend already uses a provider interface

Do **not** design V1 around running FinanceToolkit inside a Netlify Function.

If small runtime endpoints are needed later, use TypeScript Netlify Functions only as a thin API/proxy layer around precomputed data, not as the technical-analysis calculation engine.

---

# 7. Suggested project structure

Use a single repository initially.

```text
stock-analysis/
  CURSOR_BUILD_PROMPT.md
  TECHNICAL_METRICS_SPEC.md
  WEBSITE_DESIGN_GUIDELINES.md
  DATA_ARCHITECTURE_AND_REPOS.md
  COMING_NEXT.md

  src/                         # React application
    app/
    components/
    domain/
    features/
    data/
      providers/
        MarketDataProvider.ts
        MockDataProvider.ts
        StaticSnapshotDataProvider.ts
    lib/

  public/
    data/                      # generated; never hand edit
      v1/

  pipeline/                    # Python pipeline
    pyproject.toml
    uv.lock
    src/
      stock_pipeline/
        config.py
        universe.py
        sources/
          base.py
          fmp_source.py
          yahoo_source.py
        normalize.py
        technicals.py
        comparisons.py
        market_context.py
        quality.py
        schemas.py
        serialize.py
        run.py
    tests/

  scripts/
  netlify.toml
  package.json
  package-lock.json
  .env.example
  .gitignore
```

Generated files under `public/data/` must be reproducible from the pipeline.

---

# 8. End-to-end data flow

## Stage 1 - Resolve the investable universe

Use FinanceDatabase metadata plus V1 configuration.

Initial filters:
- country = United States
- active securities only
- primary listings only
- common equities where practical
- mega cap and large cap only

Keep thresholds in configuration.

Example:

```yaml
universe:
  country: US
  mega_cap_min_usd: 200000000000
  large_cap_min_usd: 10000000000
  include_cap_tiers:
    - mega
    - large
```

Do not hard-code the universe into React.

Persist a normalized universe record containing at least:
- ticker
- company name
- exchange
- sector
- industry
- cap tier
- market cap if available/reliable
- sector benchmark ticker
- active flag
- source/provenance

---

## Stage 2 - Add benchmark instruments

Always include the instruments needed for relative calculations even if they are not part of the equity universe.

At minimum:
- SPY
- the 11 selected US sector ETFs listed in the technical specification

The benchmark list belongs in configuration.

---

## Stage 3 - Acquire OHLCV

Request enough daily history to calculate:
- 200-day moving averages
- 52-week metrics
- two-year historical percentiles
- warm-up periods for indicators

Recommended initial fetch:
- at least 3 calendar years of daily data

This provides enough observations after warm-up for a roughly two-trading-year percentile window.

Normalize all provider outputs into one internal schema before FinanceToolkit sees them.

Required OHLCV fields:
- date
- ticker
- open
- high
- low
- close
- adjusted close where supported
- volume
- dividends if available
- source

Use adjusted prices consistently for return/trend calculations where the metric definition requires them.

Document any exceptions.

---

## Stage 4 - Validate raw market data

Before calculating indicators, validate:
- ticker exists
- dates are sorted and unique
- no duplicate ticker/date rows
- sufficient history
- prices are positive where expected
- high >= low
- volume is non-negative
- latest date is recent enough
- no obviously stale series

A bad input must not silently become a valid-looking metric.

Attach a quality state such as:
- `OK`
- `STALE`
- `INSUFFICIENT_HISTORY`
- `SOURCE_ERROR`
- `CALCULATION_ERROR`

---

## Stage 5 - Calculate raw technical metrics

Use FinanceToolkit where it owns the calculation.

Use the project's own thin analytics functions only for calculations that are project-specific, such as:
- distance from a moving average
- relative performance versus SPY
- relative performance versus sector ETF
- moving-average alignment state
- sector/market peer percentiles
- historical percentile
- cohort fallback logic
- composite descriptive state labels

Do not duplicate an indicator implementation already supplied by FinanceToolkit without a documented reason.

---

## Stage 6 - Build the four comparison views

For every eligible metric calculate:

1. raw value
2. historical percentile
3. sector-relative percentile
4. market-relative percentile

Follow `TECHNICAL_METRICS_SPEC.md` exactly for:
- comparison policy
- sample minimums
- cohort fallbacks
- interpretation mode

Never calculate a percentile in React.

Store the actual cohort used and its sample count.

---

## Stage 7 - Calculate market context

Calculate once per market date rather than repeating identical calculations per stock.

Examples:
- SPY trend state
- QQQ trend state
- percent of eligible universe above 50-day SMA
- percent above 200-day SMA
- sector relative-performance table
- VIX context if the selected data source supports it

Serialize this as a separate market snapshot.

---

## Stage 8 - Serialize website snapshots

Use versioned JSON contracts.

Recommended paths:

```text
public/data/v1/manifest.json
public/data/v1/universe.json
public/data/v1/market/overview.json
public/data/v1/screener.json
public/data/v1/stocks/AAPL/summary.json
public/data/v1/stocks/AAPL/technicals.json
public/data/v1/stocks/AAPL/history.json
public/data/v1/stocks/MSFT/...
```

Do not create one enormous JSON file containing the entire site.

The Stock page should fetch only the stock-specific files it needs.

The Screener may use one denormalized summary file optimized for filtering/sorting.

---

# 9. Snapshot schema requirements

Every generated file should include metadata.

Example:

```json
{
  "schemaVersion": "1.0.0",
  "marketDate": "2026-10-12",
  "generatedAt": "2026-10-13T00:15:00Z",
  "pipelineVersion": "git-sha-or-version",
  "dataSources": ["FinancialModelingPrep"],
  "payload": {}
}
```

At the stock-metric level retain:
- metric id
- raw value
- display unit
- historical percentile
- historical sample size
- sector percentile
- sector cohort label
- sector sample size
- market percentile
- market cohort label
- market sample size
- interpretation state
- as-of date
- data-quality state
- source provenance where useful

Use Pydantic models in Python and equivalent TypeScript/Zod validation in the frontend.

A schema mismatch should fail visibly rather than rendering corrupted data.

---

# 10. Website data connection

The frontend must consume an abstract provider contract.

```ts
export interface StockDataProvider {
  getManifest(): Promise<DataManifest>;
  getMarketOverview(): Promise<MarketOverview>;
  getUniverse(): Promise<StockSummary[]>;
  getScreener(): Promise<ScreenerRow[]>;
  getStockSummary(ticker: string): Promise<StockSummary>;
  getStockTechnicals(ticker: string): Promise<StockTechnicals>;
  getStockHistory(ticker: string): Promise<OHLCVPoint[]>;
}
```

Implement at least:

### `MockDataProvider`

Purpose:
- UI development
- story/demo states
- deterministic tests

### `StaticSnapshotDataProvider`

Purpose:
- production V1

Behavior:
- `fetch('/data/v1/...')`
- validates the response schema
- exposes typed domain objects to the UI

Future:

### `ApiDataProvider`

Purpose:
- intraday data, user-specific features or a future persistent backend

The page components must not know which provider is active.

---

# 11. Browser caching and freshness

Data is end-of-day, so prioritize fast reads over real-time invalidation.

`manifest.json` should be the freshness authority.

The application should display:
- market date
- generated timestamp
- stale-data warning if appropriate

Suggested pattern:
1. fetch manifest first
2. determine current snapshot version/date
3. fetch page data
4. cache immutable stock snapshot files aggressively where URLs are versioned

For the first implementation, simple date/version query parameters are acceptable:

```text
/data/v1/stocks/AAPL/technicals.json?v=2026-10-12
```

Do not hide stale data. If the last successful snapshot is old, say so in the UI.

---

# 12. Netlify build integration

Recommended Netlify build steps:

```text
1. install Node dependencies
2. install Python pipeline dependencies
3. run Python data pipeline
4. validate generated snapshots
5. run frontend tests that are appropriate for CI
6. run Vite production build
7. deploy
```

Example conceptual build command:

```bash
npm run data:build && npm run build
```

Where `npm run data:build` delegates to the Python pipeline.

Example only:

```json
{
  "scripts": {
    "data:build": "python -m stock_pipeline.run",
    "build": "vite build"
  }
}
```

Adapt paths to the final Python project configuration.

---

# 13. Scheduled EOD refresh

Use a Netlify Build Hook to trigger a fresh build/deploy.

Use GitHub Actions only as the scheduler that POSTs to the private build-hook URL.

Recommended cadence:
- once on US trading weekdays after enough time has passed for EOD data to settle
- use `America/New_York` scheduling where supported so daylight-saving changes do not shift the intended market-relative time
- a reasonable initial target is around 7:00 PM New York time Monday-Friday

The pipeline itself must inspect the latest market date. Do not assume every weekday is a trading day.

Store the Netlify Build Hook URL as a GitHub Actions secret.

Never commit the hook URL.

Conceptual workflow:

```yaml
name: Trigger EOD stock-site refresh

on:
  schedule:
    - cron: "0 19 * * 1-5"
      timezone: "America/New_York"
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Netlify build
        run: curl -fsS -X POST -d '{}' "$NETLIFY_BUILD_HOOK"
        env:
          NETLIFY_BUILD_HOOK: ${{ secrets.NETLIFY_BUILD_HOOK }}
```

Treat this as a template and validate GitHub Actions syntax in the implementation environment.

---

# 14. Secrets and environment variables

Never use `VITE_` prefixes for secrets. Vite-prefixed values are intended for browser exposure.

Potential server/build-only variables:

```text
FMP_API_KEY=
SEC_IDENTITY_EMAIL=          # later, when EdgarTools is enabled
MARKET_DATA_SOURCE=fmp
ALLOW_YAHOO_FALLBACK=true
DATA_LOOKBACK_YEARS=3
```

Potential non-secret frontend/build configuration:

```text
VITE_DATA_MODE=snapshot
VITE_DATA_SCHEMA_VERSION=1
```

Commit a `.env.example` containing names only, never real values.

---

# 15. Data-source provenance

Every snapshot should make it possible to answer:

> Where did this number come from?

Store provenance at a practical level.

Examples:
- OHLCV source = `FinancialModelingPrep`
- indicator engine = `FinanceToolkit`
- universe source = `FinanceDatabase`
- comparison engine = `internal:v1`

For each metric help dialog, it is useful to show the calculation source/method when space permits.

This is especially valuable when different providers disagree.

---

# 16. Data quality and deployment gate

Do not deploy a new snapshot merely because the pipeline completed.

Create validation gates.

Suggested V1 checks:
- manifest generated
- market date present
- SPY data available
- all configured sector benchmarks available
- >= 95% of target universe has a valid latest close
- no duplicate tickers
- no duplicate ticker/date observations
- no impossible OHLC values
- metric schema validation passes
- screener row count matches expected eligible universe within tolerance
- stale market date is flagged

Separate:
- warning conditions
- fatal conditions

Examples:
- 1 stock missing due to a symbol change = warning/exclusion
- SPY missing = fatal
- 40% of universe missing = fatal

Write a machine-readable quality report:

```text
public/data/v1/quality.json
```

Optionally expose a compact data-health status in the application's About/Diagnostics area later.

---

# 17. Failure behavior

If market-data acquisition fails:
- retry only a small bounded number of times
- do not substitute fabricated values
- do not silently mix dates across the cross-sectional cohort

If one symbol fails:
- mark/exclude it according to quality policy
- allow the broader snapshot to succeed if quality thresholds are met

If a core benchmark or large share of the universe fails:
- fail the build
- preserve the previous successful Netlify production deploy

The UI must never convert missing metrics into zero.

---

# 18. Local development workflow

Support two explicit modes.

## Mock mode

```text
VITE_DATA_MODE=mock
```

Use when:
- designing pages
- testing edge cases
- working without API credentials

## Snapshot mode

```text
VITE_DATA_MODE=snapshot
```

Workflow:
1. configure local build-only market-data credentials
2. run the Python pipeline
3. generate `public/data/v1`
4. start Vite

Provide developer commands such as:

```text
npm run data:build
npm run dev
npm test
```

Keep credentials out of git.

---

# 19. Internal storage / caching

FinanceToolkit supports cached external data. Use caching where practical to avoid unnecessary re-fetching.

However, do not make V1 correctness depend on an ephemeral build cache being preserved forever.

Recommended priority:
1. pipeline is reproducible from source data
2. cache improves speed/cost
3. cache loss should cause a slower refresh, not incorrect results

For intermediate analytics, Parquet is preferred over large ad-hoc CSV files because it preserves types and is efficient.

Possible internal artifacts:

```text
pipeline/cache/ohlcv.parquet
pipeline/cache/universe.parquet
pipeline/cache/finance_toolkit.sqlite
```

These are implementation/cache artifacts, not frontend contracts.

Do not expose the internal SQLite/cache database to the browser.

---

# 20. Size and performance strategy

Do not make the browser download every stock's history at startup.

Recommended payload split:

### Global, small
- manifest
- market overview
- universe metadata
- screener summary

### Per-stock, lazy loaded
- stock summary
- technical metrics
- chart history

Optimize JSON for the website rather than serializing raw Pandas output directly.

Round display-oriented values to sensible precision only at the presentation boundary; preserve enough internal precision for calculations.

Let Netlify/CDN compression handle text assets, and avoid embedding giant JSON objects in the JavaScript bundle.

---

# 21. Market-date consistency rule

Cross-sectional comparisons are valid only when observations refer to the same effective market date.

The percentile engine must not compare:
- AAPL from Monday
- MSFT from Friday
- NVDA from Thursday

as though they were one same-date cohort.

If a ticker is missing the common market date:
- exclude it from that cross-sectional calculation
- record the resulting sample size
- flag the ticker's own latest-data state if necessary

This rule is essential for trustworthy sector and market percentiles.

---

# 22. Corporate actions and adjusted prices

Use adjusted historical prices for total-return/trend calculations where appropriate so splits do not create false signals.

Retain raw OHLC where useful for candlestick display if the data source differentiates it cleanly.

Document the convention once and apply it consistently.

Do not mix adjusted close with unadjusted historical moving-average calculations without an explicit reason.

---

# 23. Sector mapping

Create one canonical internal sector taxonomy.

The V1 target is the 11-sector structure used by the site.

Create a mapping layer from provider/FinanceDatabase labels to canonical IDs such as:

```text
communication-services
consumer-discretionary
consumer-staples
energy
financials
health-care
industrials
information-technology
materials
real-estate
utilities
```

Map each canonical sector to its sector benchmark ETF in configuration.

Do not scatter ETF ticker mapping across components.

---

# 24. Recommended source-of-truth hierarchy

For V1:

```text
Instrument identity / sector / industry
    -> FinanceDatabase + project normalization

Daily OHLCV
    -> configured market-data provider

Standard technical indicator formulas
    -> FinanceToolkit

Historical/sector/market percentiles
    -> project comparison engine

Interpretation states
    -> TECHNICAL_METRICS_SPEC.md + project rules

UI labels/help
    -> centralized metric metadata definitions

SEC ownership / filing data
    -> EdgarTools later
```

When two sources disagree, do not average them. Preserve source provenance and decide which source is authoritative for that field.

---

# 25. Avoid these architecture mistakes

Do not:
- put market-data API keys in React
- fetch hundreds of provider endpoints from users' browsers
- calculate RSI/MACD/percentiles in UI components
- use five indicator libraries for the same calculation
- treat FinanceDatabase as live price data
- treat awesome-quant as a dependency
- introduce OpenBB in V1 without a demonstrated need
- store giant Pandas-style JSON payloads as one file
- rely on one universal percentile interpretation
- silently compare stale observations with current ones
- silently fall back between vendors without recording provenance
- automatically deploy obviously incomplete data
- assume a data provider's license allows public redistribution

---

# 26. V1 implementation phases for Cursor

## Phase A - frontend with mocks

Build:
- domain interfaces
- `MockDataProvider`
- pages/components
- metric help system
- section reference system
- deterministic edge-case fixtures

No credentials needed.

## Phase B - Python pipeline skeleton

Build:
- universe adapter
- market-data adapter protocol
- normalized OHLCV schema
- Pydantic output schemas
- quality validation
- serialization

Initially support a small ticker fixture.

## Phase C - FinanceToolkit calculations

Wire the selected V1 indicators.

Verify several calculations manually against known sample data.

## Phase D - comparison engine

Implement:
- historical percentiles
- sector cohorts
- market cohorts
- cohort fallbacks
- sample counts
- metric-aware interpretation metadata

## Phase E - static snapshot provider

Generate real snapshot JSON and switch the frontend to `StaticSnapshotDataProvider`.

Keep mock mode working.

## Phase F - Netlify automation

Add:
- Netlify build configuration
- build-only secrets
- scheduled build hook trigger
- data quality gate
- freshness UI

## Phase G - production hardening

Add:
- logging
- bounded retries
- stale-data detection
- provider provenance
- regression tests for critical metrics
- performance checks

---

# 27. Future migration path

The V1 interface is intentionally designed so storage can change without rewriting pages.

## When to move beyond static snapshots

Consider a runtime API/backend when the product requires:
- intraday updates
- real-time alerts
- user accounts
- large personalized watchlists
- server-side search across a much larger universe
- write operations
- portfolio history
- complex ownership queries
- many markets and providers

At that point:

```text
React / Netlify
      |
      v
API layer
      |
      +--> analytics database
      +--> object storage / time-series data
      +--> scheduled Python workers
      +--> provider adapters / OpenBB if useful
```

The React provider changes from `StaticSnapshotDataProvider` to `ApiDataProvider`; page components should need little or no change.

---

# 28. Future Extras architecture

When ownership data is activated:

```text
SEC EDGAR
   |
   v
EdgarTools
   |
   +--> normalized Form 4 transactions
   +--> normalized 13F holdings
   +--> normalized 13D/G events
   |
   v
Extras snapshot/API
   |
   v
React Extras pages
```

Keep ownership data separate from the technical-indicator pipeline even if both eventually share storage.

This avoids making a failure in SEC ingestion block the core daily technical snapshot.

---

# 29. Legal/data-license reminder

Open-source software licenses and market-data licenses are separate issues.

The selected Python libraries may be open source, but the data retrieved through FMP, Yahoo, exchanges or other providers can have separate usage/redistribution restrictions.

Before making the Netlify site publicly accessible:
- review the selected provider's current terms
- confirm whether displaying or redistributing derived/raw data is permitted
- prefer authenticated/private access if the intended use remains personal and the source terms require it

Do not infer market-data redistribution rights from an MIT/Apache software license.

---

# 30. Cursor acceptance checklist

The architecture work is complete only when all of the following are true:

- [ ] `FinanceToolkit` is the main V1 indicator engine.
- [ ] `FinanceDatabase` supplies universe/reference metadata.
- [ ] The market-data provider is abstracted behind a Python adapter.
- [ ] FMP and/or Yahoo can be replaced without changing React pages.
- [ ] `awesome-quant` is not an app dependency.
- [ ] `EdgarTools` is documented as deferred Extras infrastructure.
- [ ] OpenBB is documented as a later integration option, not a V1 requirement.
- [ ] Python performs all technical calculations and peer percentiles.
- [ ] Generated website data is schema-versioned and validated.
- [ ] React reads data only through the typed provider layer.
- [ ] Mock mode and real snapshot mode both work.
- [ ] Secrets are not exposed through Vite/browser environment variables.
- [ ] Netlify can build the Python snapshot before the Vite production build.
- [ ] A scheduled mechanism can trigger an EOD deploy.
- [ ] The UI displays snapshot freshness.
- [ ] Data-quality gates can stop a bad snapshot from replacing a good deploy.
- [ ] Data provenance is retained.
- [ ] The design can later switch to an API without rewriting page components.

---

# 31. External references

Primary project references:
- FinanceToolkit: https://github.com/JerBouma/FinanceToolkit
- FinanceDatabase: https://github.com/JerBouma/FinanceDatabase
- EdgarTools: https://github.com/dgunning/edgartools
- yfinance: https://github.com/ranaroussi/yfinance
- awesome-quant: https://github.com/wilsonfreitas/awesome-quant
- OpenBB: https://github.com/OpenBB-finance/OpenBB

Platform references:
- Netlify build hooks: https://docs.netlify.com/build/configure-builds/build-hooks/
- Netlify build software: https://docs.netlify.com/build/configure-builds/available-software-at-build-time/
- Netlify Functions: https://docs.netlify.com/build/functions/get-started/
- Netlify Blobs, for a possible later snapshot store: https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- GitHub Actions schedule events: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows

FinanceToolkit supports custom external historical datasets, which is why the market-data provider remains replaceable rather than being hard-wired into the UI.
