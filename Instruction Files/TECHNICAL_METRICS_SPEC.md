# Technical Metrics Specification

## 1. Scope

This specification defines the V1 technical-analysis model for a personal stock-market research site.

Initial scope:
- Primary market: United States
- Universe: mega-cap and large-cap equities only
- Frequency: end-of-day / daily
- Primary use: research and comparison, not automated trade execution
- Future markets: India and others
- Fundamental analysis: later phase

The site should explain what every metric means and how to interpret it. It should not present technical indicators as deterministic buy/sell advice.

---

## 2. Core principle: every metric has four views

For every eligible metric, store and display four views:

1. **Raw value** — the actual value today.
2. **Historical percentile** — today's value relative to the same stock's own rolling history.
3. **Sector-relative percentile** — today's value relative to an appropriate same-date sector peer cohort.
4. **Market-relative percentile** — today's value relative to an appropriate same-date US large/mega-cap peer cohort.

Example:

| View | Example |
|---|---|
| Raw | ATR % = 2.7% |
| Historical | 88th percentile vs this stock's last 2 years |
| Sector | 76th percentile vs eligible Technology peers |
| Market | 82nd percentile vs eligible US large/mega-cap peers |

### Important: percentile is context, not a quality score

An 88th percentile is not automatically "good". It means the observation is higher than 88% of the selected comparison distribution. Whether that is attractive, risky, neutral, stretched, or simply unusual depends on the metric.

Examples:
- High relative strength can be positive.
- High ATR means higher volatility, not "better".
- High RSI can mean strong momentum or an extended condition.
- High relative volume means unusual participation, but direction still matters.
- A very deep drawdown percentile can indicate weakness rather than opportunity.

Never label a percentile as good/bad without applying the metric's interpretation policy.

---

## 3. Solving the denominator / peer-group problem

The number of observations in the denominator is not itself the key issue. A percentile remains a percentile whether the cohort contains 50 or 1,000 names. The important questions are:

- Is the peer cohort economically relevant?
- Is the metric directionally interpretable?
- Is the sample large enough to be stable?
- Are we comparing observations from the same date and frequency?

### 3.1 Metric-aware comparison policy

Every metric definition must declare a `comparisonPolicy` rather than using one universal denominator.

Suggested policy types:

- `SELF_HISTORY` — stock versus its own history.
- `SECTOR` — all eligible stocks in the same sector.
- `SECTOR_SIZE` — same sector and same market-cap tier where sample size is sufficient.
- `SIZE` — same market-cap tier across the market.
- `MARKET` — all eligible large/mega-cap stocks.
- `BENCHMARK_RELATIVE` — performance versus SPY and/or sector ETF rather than a raw cross-sectional percentile.

The UI still presents four consistent views, but it must disclose the exact cohort used.

Example label:

> Sector percentile: 76th · Technology / Large Cap · n=47 · as of 2026-10-12

### 3.2 Cohort fallback rules

Use configurable minimum cohort sizes.

Recommended V1 defaults:
- Preferred minimum cross-sectional cohort: 30
- Hard minimum: 20

Fallback example for a `SECTOR_SIZE` metric:
1. Same sector + same cap tier if n >= 30.
2. Same sector if n < 30.
3. Same cap tier market-wide if sector cohort is still too small.
4. Broad large/mega universe only as the final fallback.

Always store the cohort actually used.

### 3.3 Universe definition

Keep thresholds in configuration, not hard-coded throughout the application.

Suggested initial defaults:
- Mega cap: market cap >= $200B
- Large cap: $10B <= market cap < $200B

The exact thresholds can be changed later without rewriting metric logic.

### 3.4 Historical percentile

Default rolling window:
- 2 trading years, approximately 504 valid daily observations

Minimum observations before showing a historical percentile:
- 126 valid observations

If insufficient:
- show `Insufficient history`
- do not silently calculate against a tiny sample

Store:
- percentile
- sample count
- lookback start/end
- latest raw value

### 3.5 Cross-sectional percentile

Calculate from same-date observations only.

Requirements:
- same metric definition
- same frequency
- sufficient valid data
- exclude stale prices / clearly invalid values
- record n
- record cohort definition
- record calculation timestamp

### 3.6 Optional internal robust normalization

For later ranking/research, compute a robust z-score internally using median and MAD where useful. Do not make z-score a required V1 display value.

Percentiles remain the preferred user-facing normalization because they are easier to interpret.

---

## 4. Interpretation modes

Every metric must declare an `interpretationMode`.

### `HIGHER_IS_STRONGER`
Examples:
- relative strength versus benchmark
- rate of change, when positive

### `LOWER_IS_BETTER`
Use only when there is a defensible directional meaning. Avoid overusing this.

### `TARGET_RANGE`
Values near a useful range are more informative than simply higher/lower.

### `EXTREME_CONTEXT`
High/low percentiles mean unusual conditions, not good/bad.
Examples:
- RSI
- ATR %
- realized volatility
- relative volume
- Bollinger Band width

### `CATEGORICAL`
Derived states are more useful than numerical ranking.
Examples:
- moving-average alignment
- price above/below key moving averages
- market regime

### `TWO_SIDED_RISK`
Magnitude matters and the sign/direction matters separately.
Examples:
- drawdown
- deviation from moving average

---

## 5. Technical dimensions and V1 metrics

### 5.1 Price Performance

Track:
- 1D return
- 5D return
- 1M return (~21 trading days)
- 3M return (~63 trading days)
- 6M return (~126 trading days)
- YTD return
- 1Y return (~252 trading days)
- distance from 52-week high
- distance from 52-week low

Display:
- compact return strip
- small sparkline where appropriate
- relative comparison to SPY and sector ETF for major horizons

Interpretation:
- positive/negative direction is meaningful
- market-relative and sector-relative returns are more important than raw returns alone

---

### 5.2 Trend

Track:
- SMA 20
- SMA 50
- SMA 200
- distance from SMA 20 (%)
- distance from SMA 50 (%)
- distance from SMA 200 (%)
- slope of SMA 20
- slope of SMA 50
- slope of SMA 200
- moving-average alignment state
- ADX 14

Suggested alignment states:
- `STRONG_UPTREND`: Price > SMA20 > SMA50 > SMA200
- `UPTREND`: Price > SMA50 > SMA200 but short-term alignment mixed
- `MIXED`: no clean ordering
- `DOWNTREND`: Price < SMA50 < SMA200 or similar weakening structure
- `STRONG_DOWNTREND`: Price < SMA20 < SMA50 < SMA200

Do not label these states BUY or SELL.

Help example:
> Price > SMA20 > SMA50 > SMA200 means the current price is above progressively longer-term averages. This is a clean bullish alignment, but it does not guarantee future returns. Compare the distances and slopes to see whether the trend is strengthening or becoming stretched.

ADX rough reference:
- < 20: weak / little trend
- 20–25: developing trend
- > 25: meaningful trend
- > 40: very strong trend

ADX does not indicate direction. Direction must come from price structure / moving averages.

---

### 5.3 Momentum

Track:
- RSI 14
- MACD 12/26/9
- MACD signal
- MACD histogram
- MACD histogram direction
- ROC 20D
- ROC 63D

RSI interpretation should be contextual, not a binary 70/30 rule.

Suggested state language:
- < 30: weak / oversold context
- 30–45: weak momentum
- 45–55: neutral
- 55–70: positive momentum
- > 70: strong / potentially extended momentum

Also show historical percentile for RSI so users can distinguish "high by textbook threshold" from "high relative to this stock's normal behavior".

MACD display:
- above/below signal
- above/below zero
- histogram increasing/decreasing

---

### 5.4 Relative Strength

Primary benchmarks:
- market: SPY
- sector: mapped sector ETF

Initial sector ETF mapping:
- Technology → XLK
- Financials → XLF
- Health Care → XLV
- Consumer Discretionary → XLY
- Consumer Staples → XLP
- Industrials → XLI
- Energy → XLE
- Utilities → XLU
- Real Estate → XLRE
- Materials → XLB
- Communication Services → XLC

Track relative performance for:
- 1M
- 3M
- 6M
- 12M

Derived states:
- `LEADING_MARKET_AND_SECTOR`
- `LEADING_MARKET`
- `LEADING_SECTOR`
- `IN_LINE`
- `LAGGING`

This dimension should be visually prominent.

---

### 5.5 Volatility & Risk

Track:
- ATR 14
- ATR % = ATR14 / price * 100
- 20D realized volatility
- 60D realized volatility
- Bollinger Band width
- current drawdown from rolling peak
- 1Y maximum drawdown

Interpretation vocabulary:
- Quiet
- Normal
- Elevated
- Extreme

Do not use green/red to imply high volatility is good/bad. Treat it primarily as a risk / regime characteristic.

ATR % should be preferred over dollar ATR for comparison across stocks.

---

### 5.6 Volume & Participation

Track:
- daily volume
- 20D average volume
- relative volume = daily volume / 20D average volume
- 20D average dollar volume
- Chaikin Money Flow 20D

Optional later:
- OBV

Suggested relative-volume state language:
- < 0.75x: light participation
- 0.75x–1.25x: normal
- 1.25x–2.0x: active
- > 2.0x: exceptional activity

Volume must be interpreted together with price direction.

Example:
> RVOL 2.3x means trading activity is unusually high, but does not indicate whether that participation is bullish or bearish by itself.

---

### 5.7 Price Structure / Breakouts

V1:
- distance from 52-week high
- distance from 52-week low
- 20-day high / low state
- 55-day high / low state
- breakout flag with relative-volume confirmation

Do not make Fibonacci, pivot points, Ichimoku, Supertrend, or complex pattern detection a V1 requirement.

This area should be revisited later with backtesting.

---

### 5.8 Market Context

Calculate once daily and reuse across stock pages.

Track:
- SPY above/below 50DMA
- SPY above/below 200DMA
- QQQ above/below 200DMA
- percentage of tracked universe above 50DMA
- percentage of tracked universe above 200DMA
- VIX level and historical percentile when data is available
- stock sector ETF relative performance versus SPY

Derived market regime examples:
- Risk-on / broad strength
- Positive but narrowing
- Mixed / range-bound
- Defensive / weakening
- Broad risk-off

Avoid claiming predictive certainty.

---

## 6. Technical summary UI model

Do not create a single "87/100 = Strong Buy" score in V1.

Instead create six interpretable dimension states:

1. Trend
2. Momentum
3. Relative Strength
4. Volatility / Risk
5. Volume / Participation
6. Market Context

Example summary ribbon:

> Trend: Strong Uptrend · Momentum: Positive / Extended · Relative Strength: Leading · Volatility: Elevated · Volume: Normal · Market: Positive

Each state should be clickable and scroll to its underlying section.

Use text + icon + color, never color alone.

---

## 7. How every metric should be explained

Every displayed metric must have a help definition accessible through a `?` control.

Help content schema:

```ts
interface MetricHelp {
  metricId: string;
  title: string;
  plainEnglish: string;
  formula?: string;
  howToRead: string[];
  compareAgainst: string[];
  caveats: string[];
  example?: string;
}
```

Example for Moving Average Alignment:

**What it is**
A comparison of current price and short-, medium-, and long-term moving averages.

**How to read it**
Price > SMA20 > SMA50 > SMA200 indicates a clean upward alignment. The inverse indicates a clean downward alignment. Mixed ordering suggests a transition or range-bound condition.

**What to compare**
Look at distance from each moving average and whether the averages themselves are rising or falling.

**Caveat**
Moving averages lag price and can generate whipsaws in sideways markets.

---

## 8. Metric data contract

Suggested normalized record:

```ts
interface MetricObservation {
  metricId: string;
  asOf: string;
  rawValue: number | string | null;
  displayValue: string;
  unit?: string;

  historical?: {
    percentile: number | null;
    sampleSize: number;
    lookbackDays: number;
    startDate?: string;
  };

  sectorRelative?: {
    percentile: number | null;
    cohortLabel: string;
    sampleSize: number;
    fallbackLevel?: string;
  };

  marketRelative?: {
    percentile: number | null;
    cohortLabel: string;
    sampleSize: number;
    fallbackLevel?: string;
  };

  interpretation: {
    mode: string;
    state: string;
    shortText: string;
  };

  dataQuality?: {
    status: 'good' | 'partial' | 'stale' | 'insufficient';
    message?: string;
  };
}
```

---

## 9. Data quality rules

Never silently invent or fill missing market observations.

Show:
- `—` for unavailable values
- a short explanation on hover/click
- stale-data timestamp if applicable

Every page should display an `As of` timestamp.

For cross-sectional calculations, record the number of valid securities used.

For adjusted price calculations, use adjusted close where appropriate so splits/dividends do not create false signals.

---

## 10. Future technical research

Deferred from V1:
- Fibonacci retracements
- pivot points
- Ichimoku
- Supertrend
- Keltner channels
- Stochastic oscillator
- Williams %R
- CCI
- Aroon
- Vortex
- pattern recognition
- support/resistance scoring
- multi-timeframe confirmation
- composite technical score

Before promoting additional indicators into the main UI, test whether they add distinct information beyond existing dimensions and whether they improve historical decision quality.
