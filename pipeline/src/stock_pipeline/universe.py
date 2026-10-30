from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Sequence

from .config import (
    SECTOR_BENCHMARKS,
    SECTOR_LABELS,
    PipelineConfig,
    always_include_tickers,
)
from .seed_tickers import seed_universe
from .sp500 import load_universe, refresh_and_save, universe_path

logger = logging.getLogger(__name__)


def _stub_row(ticker: str, config: PipelineConfig, source: str) -> Dict[str, Any]:
    return {
        "ticker": ticker.upper(),
        "company": ticker.upper(),
        "sectorId": "industrials",
        "sector": SECTOR_LABELS["industrials"],
        "industry": "—",
        "exchange": "NYSE",
        "marketCap": float(config.large_cap_min_usd),
        "capTier": "large",
        "sectorBenchmark": SECTOR_BENCHMARKS["industrials"],
        "active": True,
        "source": source,
    }


def resolve_universe(
    config: PipelineConfig,
    *,
    limit: Optional[int] = None,
    tickers: Optional[Sequence[str]] = None,
    refresh_universe: bool = False,
) -> tuple[List[Dict[str, Any]], str, List[str]]:
    """Return (equity_rows, universe_source, warnings).

    Default source is the checked-in S&P 500 constituent file. Refresh that file
    from Wikipedia when refresh_universe=True (or when the file is missing).
    """

    warnings: List[str] = []

    if tickers:
        wanted = [t.strip().upper() for t in tickers if t.strip()]
        by_ticker: Dict[str, Dict[str, Any]] = {}
        try:
            for row in load_universe():
                by_ticker[row["ticker"]] = row
        except Exception:  # noqa: BLE001
            for row in seed_universe():
                by_ticker[row["ticker"]] = row
        rows = []
        for ticker in wanted:
            rows.append(dict(by_ticker[ticker]) if ticker in by_ticker else _stub_row(ticker, config, "cli:ticker"))
        if limit is not None:
            rows = rows[:limit]
        return rows, "cli:tickers", warnings

    path = universe_path()
    if refresh_universe or not path.is_file():
        try:
            refresh_and_save(config, path=path)
        except Exception as exc:  # noqa: BLE001
            message = f"Could not refresh S&P 500 universe ({exc})."
            logger.warning(message)
            warnings.append(message)
            if not path.is_file():
                warnings.append("Falling back to curated seed universe.")
                return seed_universe(limit), "seed:curated", warnings

    try:
        rows = load_universe(path)
        source = "sp500:file"
    except Exception as exc:  # noqa: BLE001
        message = f"S&P 500 universe file unreadable ({exc}); using curated seed."
        logger.warning(message)
        warnings.append(message)
        return seed_universe(limit), "seed:curated", warnings

    if limit is not None:
        rows = rows[:limit]
    return rows, source, warnings


def required_benchmarks() -> List[str]:
    return always_include_tickers()
