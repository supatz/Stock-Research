# Stock Research

A personal, explainable end-of-day research dashboard for US large- and
mega-cap equities. The V1 separates trend, momentum, relative strength,
volatility, participation, price structure, and market context instead of
producing a black-box buy/sell score.

The current application uses deterministic mock observations. They are designed
to exercise normal, stale, fallback-cohort, and insufficient-history states;
they are **not live market data**.

## Start locally

Requirements: Node.js 20+ (24 is used in Netlify) and Python 3.9+.

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run data:build   # generate versioned bootstrap snapshot metadata
npm run test:run     # run frontend tests once
npm run build        # type-check and build dist/
python3 serve.py     # serve dist/ at http://127.0.0.1:8765
```

Do not open `dist/index.html` through `file://`; browser fetch and routing
behavior requires a local HTTP server.

## Product areas

- **Market** — regime, indices, sector leadership, and breadth.
- **Screener** — filterable and sortable large/mega-cap universe.
- **Stock Detail** — chart and explainable technical dimensions.
- **Watchlist** — locally persisted ticker tracking.
- **Extras** — polished placeholders for deferred SEC ownership work.

Every page and meaningful section has a stable reference ID. Its `i` control
copies a value such as `Stock Detail / Trend [section.stock.trend]`. Every
displayed metric uses a separate `?` control for interpretation help.

## Architecture

```text
Python build-time pipeline
  -> validated, versioned public/data/v1 snapshots
  -> typed frontend provider
  -> React pages and reusable metric components
```

The browser never receives provider secrets and never calculates universe-wide
technical indicators or peer percentiles. Frontend pages depend on a provider
contract so deterministic mock fixtures can later be replaced by static JSON
without rewriting the UI.

The Python package under `pipeline/` establishes:

- a swappable market-data source protocol,
- canonical sector benchmark configuration,
- snapshot/metric contracts,
- bootstrap manifest and quality output.

The next data phase will add FinanceDatabase universe metadata, a Yahoo/FMP
OHLCV adapter, FinanceToolkit indicators, historical/peer comparison engines,
Pydantic validation, and hard deployment quality gates. The bootstrap generator
does not invent missing market data.

## Data modes and secrets

```bash
VITE_DATA_MODE=mock       # deterministic local fixtures
VITE_DATA_MODE=snapshot   # generated JSON provider (once live snapshots exist)
```

Copy `.env.example` to `.env` for local configuration. Never commit `.env`, API
keys, GitHub tokens, Netlify build hooks, SSH private keys, or macOS Keychain
contents. Variables prefixed with `VITE_` are exposed to the browser and must
not contain secrets.

See [Data refresh and publish](docs/DATA_REFRESH.md) for the refresh menu,
double-click macOS launchers, Git publish flow, Netlify setup, and recovery on a
new computer.

## Add a metric

1. Add its typed definition to the centralized metric registry, including
   interpretation mode, comparison policy, precision, and complete help text.
2. Add an observation in the provider/fixture or Python serializer.
3. Render it through the reusable metric card; do not put financial
   interpretation logic in a page component.
4. Add tests for formatting, unavailable values, cohort/sample details, and
   interpretation.

Percentiles are context, not quality scores. A high relative-strength percentile
can be positive; a high ATR percentile is a risk/regime observation; a high RSI
can be strong and extended.

## Add a page or section reference

1. Register one unique stable ID in the central reference registry.
2. Use the shared page/section header and reference control.
3. Add a test for the exact copied reference string.

IDs are API-like identifiers: avoid changing them after release.

## Deployment

`netlify.toml` runs snapshot generation, tests, and the Vite build, then
publishes `dist/`. SPA redirects support `/stocks/:ticker`.

A Netlify Build Hook schedule template lives at
`docs/github-workflows/trigger-netlify.yml`. Copy it to `.github/workflows/`
after the GitHub credential has the `workflow` scope. Store the hook only in
the repository secret `NETLIFY_BUILD_HOOK`. A failed Netlify build preserves
the prior successful deploy.

Before public deployment, verify the current market-data provider's display and
redistribution terms. Open-source library licenses do not grant market-data
redistribution rights.

## Source documents

The full product, metric, architecture, visual, roadmap, and refresh
specifications are committed under `Instruction Files/` so the project can be
recovered and continued on a new system.