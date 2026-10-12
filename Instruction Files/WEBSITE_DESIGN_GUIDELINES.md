# Website Design & UX Guidelines

## Purpose

These guidelines define the experience for a dense but readable personal stock-analysis dashboard. The goal is to make many metrics understandable without turning the interface into a wall of numbers.

The visual language should feel like a modern professional research terminal: calm, information-dense, fast, explainable, and easy to iterate.

---

## 1. Design principles

### 1.1 Progressive disclosure

Show the answer first, detail second.

Each section should follow this hierarchy:
1. State / takeaway
2. Key numbers
3. Comparison context
4. Chart / detail
5. Explanation / methodology

Do not display every calculation at equal visual weight.

### 1.2 Recognition over memorization

Users should not need to remember what an indicator means.

Every metric must have contextual help through a `?` control with:
- what it is
- how to read it
- what to compare it with
- caveats
- optional worked example

### 1.3 Context before precision

A raw number such as `ATR = 7.41` is weaker than:

> ATR % 2.7% · Elevated · 88th percentile vs own 2Y history

Use raw values, states, percentiles, peer labels, and sample sizes together.

### 1.4 Do not equate color with truth

Color reinforces meaning; it must never be the only carrier of meaning.

Always pair color with:
- text
- icons/shapes
- state labels

Do not make every high percentile green. Some high percentiles represent risk or unusual conditions rather than a positive signal.

### 1.5 Stable information architecture

Page and section names must remain stable so the user can refer to them while iterating with an AI coding assistant.

---

## 2. Page / section reference system

This is a project requirement, not an optional enhancement.

Every page and every meaningful section must have:
- a human-readable name
- a stable reference ID
- a small information/reference control

Examples:

```text
Market Overview [page.market]
Market Overview / Market Regime [section.market.regime]
Stock Detail [page.stock]
Stock Detail / Technical Snapshot [section.stock.snapshot]
Stock Detail / Trend [section.stock.trend]
Stock Detail / Momentum [section.stock.momentum]
```

### Reference control behavior

A small `i` icon appears when the page/section header is hovered or focused.

On mobile, where hover does not exist, the control must remain discoverable through tap/focus or the section overflow affordance.

On click:
1. Copy the reference string to the clipboard.
2. Show a short toast.

Recommended copied value:

```text
Stock Detail / Trend [section.stock.trend]
```

Recommended toast:

> Copied: Stock Detail / Trend [section.stock.trend]

Why include both name and stable ID:
- human-readable in chat
- unambiguous even if a displayed label changes slightly later
- easy to search in code

### Implementation rule

Create one reusable component, for example:

```tsx
<ReferenceTag
  name="Trend"
  referenceId="section.stock.trend"
  parentName="Stock Detail"
/>
```

Do not hand-code this behavior separately in each section.

---

## 3. Metric help system

The `i` reference control and the `?` metric-help control are different concepts.

- `i` = identify/copy the page or section for project iteration.
- `?` = explain how to interpret a financial/technical metric.

Do not combine them.

### Desktop
- `?` button next to metric or group label
- hover may preview a short explanation
- click opens a richer popover/drawer

### Keyboard
- control must be focusable
- Enter/Space opens it
- Escape closes transient help
- do not rely on hover alone

### Mobile
- tap opens a bottom sheet or popover large enough to read comfortably

For complex help content containing links or interactive elements, use a popover/dialog rather than a pure ARIA tooltip.

---

## 4. Information architecture

Primary navigation:

1. Market
2. Screener
3. Stock
4. Watchlist
5. Extras

### Market
- Market regime
- Major indices
- Sector leadership
- Breadth
- Volatility context

### Screener
- Filter bar
- Saved presets later
- sortable stock table
- quick technical-state chips
- relative-strength columns

### Stock
- Company header
- Technical snapshot
- Main price chart
- Trend
- Momentum
- Relative strength
- Volatility & risk
- Volume & participation
- Price structure
- Market context

### Watchlist
- compact tracked-stock table
- important state changes
- latest data timestamp

### Extras
Place future/non-core modules here initially:
- insider transactions / Form 4
- institutional holdings / 13F
- major ownership changes / 13D & 13G
- experimental indicators

---

## 5. Stock page visual hierarchy

### Layer 1 — Header

Show:
- ticker
- company name
- sector
- market-cap tier
- current price
- daily change
- latest data timestamp

### Layer 2 — Technical State Ribbon

Six concise states:
- Trend
- Momentum
- Relative Strength
- Volatility / Risk
- Volume / Participation
- Market Context

Each chip/card:
- short state label
- one primary number if useful
- click scrolls to section
- hover/focus explanation

### Layer 3 — Main chart

Use a professional financial chart with:
- candles
- volume
- toggles for SMA20 / SMA50 / SMA200
- 52-week high/low markers where useful
- period selector

Do not enable every possible overlay by default.

### Layer 4 — Dimension sections

Use repeated section grammar so scanning becomes automatic.

Each section:
- title + reference `i`
- one-sentence takeaway
- 2–5 key metric cards
- compact comparison visualization
- optional chart/table
- `?` help controls

---

## 6. Four-view metric card design

Each metric card should communicate the four views without becoming a miniature spreadsheet.

Suggested anatomy:

```text
ATR %                           [?]
2.7%                     ELEVATED

Self 2Y       Sector        Market
88th          76th          82nd
504 obs       Tech/Large    Large Cap
              n=47          n=312
```

Use a slim percentile rail/dot rather than a giant gauge.

Important:
- always show percentile label (`88th`), not just a bar
- expose peer label and `n`
- show `As of` in details
- use neutral language for context metrics

Avoid speedometer/dial charts for most metrics; they consume space and imply false precision.

---

## 7. Creative but readable visualization ideas

### 7.1 Technical State Ribbon
A horizontal row of six state cards gives the user an immediate stock profile without creating a single opaque score.

### 7.2 Comparison Rails
For each metric, show three tiny horizontal percentile rails:
- Self
- Sector
- Market

A marker indicates percentile position. Label the rail, value, and cohort.

### 7.3 Relative-Strength Matrix
Show 1M / 3M / 6M / 12M columns and two rows:
- vs SPY
- vs sector ETF

Use text plus subtle intensity, not color alone.

### 7.4 Trend Stack
Show the vertical relationship of:
- Price
- SMA20
- SMA50
- SMA200

A compact ordered stack can make MA alignment understandable faster than four separate values.

### 7.5 Volatility Regime Strip
Show where current volatility sits within the stock's own historical distribution using a percentile strip labeled:
- Quiet
- Normal
- Elevated
- Extreme

### 7.6 Metric delta annotations
When useful, show how a metric changed from a prior period:
- RSI 63 ↑ from 54 five sessions ago
- ATR percentile 88th ↑ from 61st one month ago

Do not add these everywhere; reserve them for meaningful movement.

---

## 8. Table design

Screener tables will be dense. Prioritize scanability.

Requirements:
- sticky header
- first ticker/company column sticky on wide tables
- sortable columns
- column chooser
- visible active sort/filter state
- sensible default column set
- numeric alignment to the right
- consistent decimal precision
- compact but not cramped row height
- keyboard-accessible controls

Do not place 30 columns on screen by default.

Suggested default screener columns:
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

---

## 9. Responsive behavior

Desktop is the primary research experience, but all core content must work on smaller screens.

### Desktop
- left or top primary navigation
- multi-column metric grids
- large chart
- side-by-side comparisons

### Tablet
- reduce grid columns
- retain chart functionality
- allow horizontally scrollable data tables with sticky identifiers

### Mobile
- single-column content
- state ribbon becomes horizontally scrollable or stacked
- metric detail opens in bottom sheets
- tables switch to compact cards where necessary
- no functionality should require hover

---

## 10. Accessibility

Target WCAG 2.2 AA as the baseline.

Requirements:
- semantic HTML first
- all interactive controls keyboard operable
- visible focus indicators
- sufficient text/background contrast
- charts must have accessible text summaries
- do not rely on color alone
- meaningful accessible names for icon-only controls
- `i` and `?` controls need `aria-label`
- respect reduced-motion preference
- minimum pointer target sizing/spacing consistent with WCAG 2.2 guidance
- preserve logical heading hierarchy

For tooltip-like help, follow WAI-ARIA guidance: hover is not enough; the trigger must also work through keyboard focus, and Escape should dismiss transient tooltip content.

Use proper disclosure/popover/dialog patterns when the content contains more than a short passive description.

---

## 11. Performance

The dashboard should feel immediate despite charts and tables.

Targets based on current Core Web Vitals guidance:
- LCP <= 2.5s at the 75th percentile
- INP <= 200ms at the 75th percentile
- CLS <= 0.1 at the 75th percentile

Implementation practices:
- lazy-load non-critical charts
- virtualize large tables if needed
- code-split route-level modules
- avoid shipping large raw datasets to the browser
- precompute technical metrics
- cache static reference data
- reserve dimensions for charts/skeletons to prevent layout shift
- avoid expensive calculation loops during render

Do not calculate hundreds of stock indicators in the browser on every page load.

---

## 12. Loading, empty, stale and error states

Financial dashboards need excellent non-happy-path states.

### Loading
- use skeletons matching final dimensions
- do not shift the page when data arrives

### Empty
Explain why the content is empty and what the user can do.

### Insufficient history
Display explicitly:
> Historical percentile unavailable — requires at least 126 valid observations.

### Stale data
Display:
> Data as of YYYY-MM-DD HH:mm ET

If materially stale, show a visible but non-alarming warning state.

### Error
Do not replace the entire page if one metric fails. Degrade at section/card level where possible.

---

## 13. Visual system

Use design tokens rather than hard-coded values scattered throughout components.

Token groups:
- background surfaces
- borders
- text levels
- positive directional state
- negative directional state
- caution/risk
- neutral/context
- focus ring
- spacing scale
- radii
- typography

Recommended feel:
- dark mode and light mode supported
- restrained surfaces
- limited decorative gradients
- tabular numerals for financial data
- strong typographic hierarchy
- generous whitespace between sections, compact spacing within metric groups

Do not imitate Bloomberg terminal density literally. The goal is professional research clarity, not maximal information per pixel.

---

## 14. Interaction consistency

Use the same behaviors everywhere:
- click ticker → Stock Detail
- click dimension state → scroll to section
- click `?` → interpretation help
- click section `i` → copy section reference
- hover/focus on truncated label → reveal full text
- click percentile details → show cohort, n, calculation date and fallback used

Every interactive control must have a visible hover/focus/active state.

---

## 15. Development ergonomics

Create reusable primitives from day one:
- `PageHeader`
- `SectionHeader`
- `ReferenceTag`
- `MetricCard`
- `MetricHelp`
- `PercentileRail`
- `StateBadge`
- `DataTimestamp`
- `EmptyState`
- `ErrorState`
- `StockTickerLink`

Keep page-specific presentation separate from metric calculation/data adapters.

---

## 16. Sources / standards referenced

- W3C WCAG 2.2 overview: https://www.w3.org/WAI/standards-guidelines/wcag/
- W3C WCAG 2.2 specification: https://www.w3.org/TR/WCAG22/
- WAI-ARIA Authoring Practices Guide: https://www.w3.org/WAI/ARIA/apg/
- WAI tooltip pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
- WAI disclosure pattern: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- Web.dev Core Web Vitals: https://web.dev/articles/vitals
- Web.dev Core Web Vitals thresholds: https://web.dev/articles/defining-core-web-vitals-thresholds/
