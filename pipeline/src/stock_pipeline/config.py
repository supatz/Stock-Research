from __future__ import annotations

import os
from dataclasses import dataclass


SECTOR_BENCHMARKS = {
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


@dataclass(frozen=True)
class PipelineConfig:
    data_source: str = "yahoo"
    allow_yahoo_fallback: bool = True
    lookback_years: int = 3
    large_cap_min_usd: int = 10_000_000_000
    mega_cap_min_usd: int = 200_000_000_000

    @classmethod
    def from_environment(cls) -> "PipelineConfig":
        return cls(
            data_source=os.getenv("MARKET_DATA_SOURCE", "yahoo"),
            allow_yahoo_fallback=os.getenv("ALLOW_YAHOO_FALLBACK", "true").lower()
            in {"1", "true", "yes"},
            lookback_years=int(os.getenv("DATA_LOOKBACK_YEARS", "3")),
        )
