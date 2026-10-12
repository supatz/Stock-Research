# Coming Next / Deferred Roadmap

This file captures intentionally deferred work so V1 stays focused while preserving future scope.

---

## 1. Data architecture hardening

### OpenBB integration
Evaluate OpenBB as a provider-abstraction layer when the project needs multiple data vendors, multiple markets, options, macro, news, or alternative datasets.

Do not make it a V1 dependency unless it solves a concrete data-source problem.

### Persistent storage
Move from mock/static generated datasets to persistent storage when the universe/history becomes too large for generated JSON.

Candidates to evaluate:
- Postgres / Supabase
- DuckDB/Parquet for research jobs
- object storage for historical snapshots

### Scheduled data pipeline
Create an end-of-day pipeline that:
1. fetches adjusted OHLCV
2. validates freshness
3. calculates technical indicators
4. calculates historical percentiles
5. calculates peer percentiles
6. calculates market regime
7. writes normalized output
8. records data-quality metadata

Possible scheduler options:
- GitHub Actions for early personal-use version
- dedicated Python service / cron later

Keep provider API keys server-side; never expose them in frontend code.

---

## 2. Fundamental analysis

Design a separate metric framework because relevant financial KPIs vary materially by sector/industry.

Future dimensions:
- Growth
- Profitability
- Margins
- Capital efficiency
- Balance-sheet strength
- Cash-flow quality
- Valuation
- Shareholder returns / dilution
- Earnings quality

Future requirement:
- sector-aware benchmark policies
- historical, sector, market and valuation-context comparisons
- separate treatment for financial institutions, REITs, SaaS, utilities, energy, etc.

FinanceToolkit should be evaluated as the primary calculation engine.

---

## 3. Extras: ownership & positioning

These were deliberately moved out of the core V1 experience.

### Insider transactions — Form 4
Later add:
- insider name and role
- transaction type/code
- transaction date
- filing date
- price
- shares
- value
- percentage change in insider holdings
- open-market purchase/sale distinction
- cluster buying detection

Source candidate:
- SEC EDGAR via EdgarTools

### Institutional holdings — 13F
Later add:
- new positions
- closed positions
- increased positions
- reduced positions
- quarter-over-quarter changes
- top holders
- concentration

Always communicate reporting lag prominently.

### Major ownership — 13D / 13G
Later add:
- new >5% ownership disclosures
- amendments
- beneficial ownership percentage
- filer type
- purpose / activism context where structured data allows

---

## 4. Deeper breakout / price-structure research

Revisit after V1.

Candidates:
- Donchian breakouts
- support/resistance zones
- gap analysis
- breakout confirmation by volume
- volatility contraction before breakout
- retest behavior
- anchored VWAP
- relative-strength confirmation
- false-breakout classification

Backtest each addition before making it visually prominent.

---

## 5. Additional technical indicators

Possible experiments:
- Supertrend
- Ichimoku Cloud
- Keltner Channels
- Stochastic Oscillator
- Williams %R
- CCI
- Aroon
- Vortex
- TRIX
- Fibonacci levels
- pivot points

Promotion rule:
Only add an indicator to the main dashboard if it contributes distinct information beyond the existing Trend / Momentum / Relative Strength / Volatility / Volume framework.

---

## 6. Backtesting and evidence layer

Before introducing an overall technical score, build an evidence layer.

Test:
- forward 5D / 20D / 63D returns after states
- drawdown after states
- hit rate
- payoff ratio
- performance by market regime
- performance by sector
- performance by cap tier
- combinations of signals

Avoid look-ahead bias and survivorship bias.

Possible future UI:
> Historically, this setup was followed by a positive 20D return in X% of comparable observations, median return Y%, sample n=Z.

Do not present this as a guarantee.

---

## 7. Composite scoring

Deferred.

Do not create a black-box 0–100 Strong Buy score in V1.

If introduced later:
- show component contributions
- explain weighting
- use backtested weights rather than arbitrary weights
- allow score decomposition
- separate strength from risk
- version the scoring model

---

## 8. India market expansion

Later investigate:
- NSE/BSE symbol master
- reliable adjusted historical data
- corporate actions
- sector taxonomy mapping
- benchmark mapping (NIFTY 50, NIFTY sector indices, etc.)
- market-cap universe definitions
- exchange timezone/holiday handling
- India-specific ownership/promoter data

Keep market/exchange/timezone fields in the core data model now so expansion does not require a schema rewrite.

---

## 9. Options

Potential later modules:
- implied volatility
- IV percentile/rank
- term structure
- skew
- open interest
- unusual options activity
- expected move

Do not mix these into core equity technical state until the data source and interpretation methodology are validated.

---

## 10. Macro / cross-asset context

Potential later context:
- Treasury yields
- yield curve
- dollar index
- credit spreads
- oil
- gold
- market liquidity proxies

Use only when the relationship to equity analysis is explicitly defined.

---

## 11. News and event context

Potential later additions:
- earnings dates
- earnings surprises
- guidance changes
- major filings
- corporate actions
- analyst-estimate revisions
- material 8-K events

Keep event data separate from technical signals.

---

## 12. Watchlists and alerts

Later:
- saved watchlists
- state-change alerts
- breakout alerts
- relative-strength change alerts
- volatility-regime alerts
- insider / ownership alerts

Alerts should be event-driven and explain exactly what changed.

---

## 13. Personal portfolio layer

Possible later feature:
- holdings
- cost basis
- portfolio exposures
- sector concentration
- drawdown
- correlation
- beta
- scenario/risk analysis

Keep portfolio analysis separate from stock attractiveness analysis.

---

## 14. AI-generated explanations

Potential future layer:
- summarize why technical state changed
- explain conflicting indicators
- produce a daily watchlist briefing

Requirements before implementation:
- AI must be grounded in the displayed metrics
- quote exact as-of timestamps
- distinguish facts from interpretation
- never fabricate missing data
- allow user to inspect the underlying metrics
