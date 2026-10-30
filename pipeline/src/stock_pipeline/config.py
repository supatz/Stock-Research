from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


SECTOR_BENCHMARKS: Dict[str, str] = {
    "communication-services": "XLC",
    "consumer-discretionary": "XLY",
    "consumer-staples": "XLP",
    "energy": "XLE",
    "financials": "XLF",
    "health-care": "XLV",
    "industrials": "XLI",
    "information-technology": "XLK",
    "materials": "XLB",
    "real-estate": "XLRE",
    "utilities": "XLU",
}

SECTOR_LABELS: Dict[str, str] = {
    "communication-services": "Communication Services",
    "consumer-discretionary": "Consumer Discretionary",
    "consumer-staples": "Consumer Staples",
    "energy": "Energy",
    "financials": "Financials",
    "health-care": "Health Care",
    "industrials": "Industrials",
    "information-technology": "Technology",
    "materials": "Materials",
    "real-estate": "Real Estate",
    "utilities": "Utilities",
}

# Map common FinanceDatabase / Yahoo sector strings → canonical SectorId.
SECTOR_ALIASES: Dict[str, str] = {
    "technology": "information-technology",
    "information technology": "information-technology",
    "information-technology": "information-technology",
    "communication services": "communication-services",
    "communication-services": "communication-services",
    "communications": "communication-services",
    "consumer cyclical": "consumer-discretionary",
    "consumer discretionary": "consumer-discretionary",
    "consumer-discretionary": "consumer-discretionary",
    "consumer defensive": "consumer-staples",
    "consumer staples": "consumer-staples",
    "consumer-staples": "consumer-staples",
    "energy": "energy",
    "financial services": "financials",
    "financials": "financials",
    "healthcare": "health-care",
    "health care": "health-care",
    "health-care": "health-care",
    "industrials": "industrials",
    "basic materials": "materials",
    "materials": "materials",
    "real estate": "real-estate",
    "real-estate": "real-estate",
    "utilities": "utilities",
}

INDEX_BENCHMARKS: List[Tuple[str, str]] = [
    ("SPY", "S&P 500"),
    ("QQQ", "Nasdaq 100"),
    ("DIA", "Dow Jones"),
    ("IWM", "Russell 2000"),
]

SECTOR_ETF_NAMES: Dict[str, str] = {
    "XLK": "Technology Select Sector SPDR",
    "XLF": "Financial Select Sector SPDR",
    "XLV": "Health Care Select Sector SPDR",
    "XLY": "Consumer Discretionary Select Sector SPDR",
    "XLP": "Consumer Staples Select Sector SPDR",
    "XLI": "Industrial Select Sector SPDR",
    "XLE": "Energy Select Sector SPDR",
    "XLU": "Utilities Select Sector SPDR",
    "XLRE": "Real Estate Select Sector SPDR",
    "XLB": "Materials Select Sector SPDR",
    "XLC": "Communication Services Select Sector SPDR",
}

SCHEMA_VERSION = "1.0.0"
HISTORICAL_LOOKBACK_DAYS = 504
HISTORICAL_MIN_OBSERVATIONS = 126
PREFERRED_COHORT_SIZE = 30
HARD_MIN_COHORT_SIZE = 20

PERCENTILE_METRIC_IDS = frozenset(
    {
        "return.1d",
        "return.5d",
        "return.1m",
        "return.3m",
        "return.6m",
        "return.ytd",
        "return.1y",
        "distance.52w-high",
        "distance.52w-low",
        "trend.dist-sma20",
        "trend.dist-sma50",
        "trend.dist-sma200",
        "trend.slope-sma20",
        "trend.slope-sma50",
        "trend.slope-sma200",
        "trend.adx",
        "momentum.rsi14",
        "momentum.macd-histogram",
        "momentum.roc20",
        "momentum.roc63",
        "rs.spy.1m",
        "rs.spy.3m",
        "rs.spy.6m",
        "rs.spy.12m",
        "rs.sector.1m",
        "rs.sector.3m",
        "rs.sector.6m",
        "rs.sector.12m",
        "vol.atr-pct",
        "vol.realized-20d",
        "vol.realized-60d",
        "vol.bb-width",
        "vol.drawdown",
        "vol.max-drawdown-1y",
        "volume.rvol",
        "volume.dollar-avg-20d",
        "volume.cmf-20d",
    }
)

METRIC_MODES: Dict[str, str] = {
    "return.1d": "HIGHER_IS_STRONGER",
    "return.5d": "HIGHER_IS_STRONGER",
    "return.1m": "HIGHER_IS_STRONGER",
    "return.3m": "HIGHER_IS_STRONGER",
    "return.6m": "HIGHER_IS_STRONGER",
    "return.ytd": "HIGHER_IS_STRONGER",
    "return.1y": "HIGHER_IS_STRONGER",
    "distance.52w-high": "TWO_SIDED_RISK",
    "distance.52w-low": "TWO_SIDED_RISK",
    "trend.alignment": "CATEGORICAL",
    "trend.sma20": "CATEGORICAL",
    "trend.sma50": "CATEGORICAL",
    "trend.sma200": "CATEGORICAL",
    "trend.dist-sma20": "TWO_SIDED_RISK",
    "trend.dist-sma50": "TWO_SIDED_RISK",
    "trend.dist-sma200": "TWO_SIDED_RISK",
    "trend.slope-sma20": "CATEGORICAL",
    "trend.slope-sma50": "CATEGORICAL",
    "trend.slope-sma200": "CATEGORICAL",
    "trend.adx": "EXTREME_CONTEXT",
    "momentum.rsi14": "EXTREME_CONTEXT",
    "momentum.macd": "CATEGORICAL",
    "momentum.macd-signal": "CATEGORICAL",
    "momentum.macd-histogram": "EXTREME_CONTEXT",
    "momentum.roc20": "HIGHER_IS_STRONGER",
    "momentum.roc63": "HIGHER_IS_STRONGER",
    "rs.spy.1m": "HIGHER_IS_STRONGER",
    "rs.spy.3m": "HIGHER_IS_STRONGER",
    "rs.spy.6m": "HIGHER_IS_STRONGER",
    "rs.spy.12m": "HIGHER_IS_STRONGER",
    "rs.sector.1m": "HIGHER_IS_STRONGER",
    "rs.sector.3m": "HIGHER_IS_STRONGER",
    "rs.sector.6m": "HIGHER_IS_STRONGER",
    "rs.sector.12m": "HIGHER_IS_STRONGER",
    "rs.state": "CATEGORICAL",
    "vol.atr-pct": "EXTREME_CONTEXT",
    "vol.realized-20d": "EXTREME_CONTEXT",
    "vol.realized-60d": "EXTREME_CONTEXT",
    "vol.bb-width": "EXTREME_CONTEXT",
    "vol.drawdown": "TWO_SIDED_RISK",
    "vol.max-drawdown-1y": "TWO_SIDED_RISK",
    "volume.daily": "CATEGORICAL",
    "volume.avg-20d": "CATEGORICAL",
    "volume.rvol": "EXTREME_CONTEXT",
    "volume.dollar-avg-20d": "CATEGORICAL",
    "volume.cmf-20d": "EXTREME_CONTEXT",
    "structure.20d": "CATEGORICAL",
    "structure.55d": "CATEGORICAL",
    "structure.breakout": "CATEGORICAL",
    "market.sector-vs-spy": "HIGHER_IS_STRONGER",
    "market.regime": "CATEGORICAL",
    "market.spy-vs-50dma": "CATEGORICAL",
    "market.spy-vs-200dma": "CATEGORICAL",
    "market.qqq-vs-200dma": "CATEGORICAL",
    "market.breadth-50dma": "CATEGORICAL",
    "market.breadth-200dma": "CATEGORICAL",
    "market.vix": "EXTREME_CONTEXT",
    "market.highs-20d": "CATEGORICAL",
    "market.lows-20d": "CATEGORICAL",
}

METRIC_UNITS: Dict[str, str] = {
    "return.1d": "%",
    "return.5d": "%",
    "return.1m": "%",
    "return.3m": "%",
    "return.6m": "%",
    "return.ytd": "%",
    "return.1y": "%",
    "distance.52w-high": "%",
    "distance.52w-low": "%",
    "trend.sma20": "USD",
    "trend.sma50": "USD",
    "trend.sma200": "USD",
    "trend.dist-sma20": "%",
    "trend.dist-sma50": "%",
    "trend.dist-sma200": "%",
    "trend.slope-sma20": "%",
    "trend.slope-sma50": "%",
    "trend.slope-sma200": "%",
    "momentum.roc20": "%",
    "momentum.roc63": "%",
    "rs.spy.1m": "%",
    "rs.spy.3m": "%",
    "rs.spy.6m": "%",
    "rs.spy.12m": "%",
    "rs.sector.1m": "%",
    "rs.sector.3m": "%",
    "rs.sector.6m": "%",
    "rs.sector.12m": "%",
    "vol.atr-pct": "%",
    "vol.realized-20d": "%",
    "vol.realized-60d": "%",
    "vol.bb-width": "%",
    "vol.drawdown": "%",
    "vol.max-drawdown-1y": "%",
    "market.sector-vs-spy": "%",
    "market.spy-vs-50dma": "%",
    "market.spy-vs-200dma": "%",
    "market.qqq-vs-200dma": "%",
    "market.breadth-50dma": "%",
    "market.breadth-200dma": "%",
}

STATE_LABELS: Dict[str, str] = {
    "STRONG_UPTREND": "Strong uptrend",
    "UPTREND": "Uptrend",
    "MIXED": "Mixed",
    "DOWNTREND": "Downtrend",
    "STRONG_DOWNTREND": "Strong downtrend",
    "INSUFFICIENT": "Insufficient history",
    "LEADING_MARKET_AND_SECTOR": "Leading market and sector",
    "LEADING_MARKET": "Leading market",
    "LEADING_SECTOR": "Leading sector",
    "IN_LINE": "In line",
    "LAGGING": "Lagging",
    "STRUCTURE_AT_HIGH": "At the high",
    "STRUCTURE_AT_LOW": "At the low",
    "STRUCTURE_INSIDE": "Inside the range",
    "BREAKOUT_CONFIRMED": "Breakout with volume",
    "BREAKOUT_PRICE_ONLY": "New high, ordinary volume",
    "BREAKOUT_NONE": "No breakout",
    "UNAVAILABLE": "Unavailable",
    "REGIME_RISK_ON": "Risk-on / broad strength",
    "REGIME_POSITIVE_NARROWING": "Positive but narrowing",
    "REGIME_MIXED": "Mixed / range-bound",
    "REGIME_DEFENSIVE": "Defensive / weakening",
    "REGIME_RISK_OFF": "Broad risk-off",
}


def normalize_sector(raw: str | None) -> str:
    if not raw:
        return "industrials"
    key = raw.strip().lower()
    return SECTOR_ALIASES.get(key, "industrials")


def always_include_tickers() -> List[str]:
    indexes = [t for t, _ in INDEX_BENCHMARKS]
    sectors = list(SECTOR_BENCHMARKS.values())
    return indexes + sectors


@dataclass(frozen=True)
class PipelineConfig:
    data_source: str = "yahoo"
    allow_yahoo_fallback: bool = True
    lookback_years: int = 3
    large_cap_min_usd: int = 10_000_000_000
    mega_cap_min_usd: int = 200_000_000_000
    preferred_cohort_size: int = PREFERRED_COHORT_SIZE
    hard_min_cohort_size: int = HARD_MIN_COHORT_SIZE
    historical_lookback_days: int = HISTORICAL_LOOKBACK_DAYS
    historical_min_observations: int = HISTORICAL_MIN_OBSERVATIONS
    sec_identity_email: str | None = field(default=None)
    edgar_max_age_days: int = 30

    @classmethod
    def from_environment(cls) -> "PipelineConfig":
        email = os.getenv("SEC_IDENTITY_EMAIL", "").strip() or None
        return cls(
            data_source=os.getenv("MARKET_DATA_SOURCE", "yahoo"),
            allow_yahoo_fallback=os.getenv("ALLOW_YAHOO_FALLBACK", "true").lower()
            in {"1", "true", "yes"},
            lookback_years=int(os.getenv("DATA_LOOKBACK_YEARS", "3")),
            sec_identity_email=email,
            edgar_max_age_days=int(os.getenv("EDGAR_MAX_AGE_DAYS", "30")),
        )

    def cap_tier(self, market_cap_usd: float) -> str:
        if market_cap_usd >= self.mega_cap_min_usd:
            return "mega"
        return "large"
