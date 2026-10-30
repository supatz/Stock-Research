from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import SECTOR_BENCHMARKS, SECTOR_LABELS, PipelineConfig, normalize_sector

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_UNIVERSE_PATH = REPO_ROOT / "pipeline" / "data" / "universe" / "sp500.json"

# Wikipedia GICS Sector → our SectorId
_GICS_TO_SECTOR = {
    "information technology": "information-technology",
    "financials": "financials",
    "health care": "health-care",
    "consumer discretionary": "consumer-discretionary",
    "consumer staples": "consumer-staples",
    "industrials": "industrials",
    "energy": "energy",
    "utilities": "utilities",
    "real estate": "real-estate",
    "materials": "materials",
    "communication services": "communication-services",
}


def universe_path() -> Path:
    return DEFAULT_UNIVERSE_PATH


def _row_from_wiki(record: Dict[str, Any], config: PipelineConfig) -> Optional[Dict[str, Any]]:
    ticker = str(record.get("Symbol") or record.get("symbol") or "").strip().upper()
    # Wikipedia uses BRK.B; Yahoo wants BRK-B
    ticker = ticker.replace(".", "-")
    if not ticker or len(ticker) > 6:
        return None
    company = str(record.get("Security") or record.get("security") or ticker)
    gics = str(record.get("GICS Sector") or record.get("gics sector") or "")
    sector_id = _GICS_TO_SECTOR.get(gics.strip().lower()) or normalize_sector(gics)
    industry = str(
        record.get("GICS Sub-Industry") or record.get("gics sub-industry") or "—"
    )
    return {
        "ticker": ticker,
        "company": company,
        "sectorId": sector_id,
        "sector": SECTOR_LABELS[sector_id],
        "industry": industry,
        "exchange": "NYSE",  # refined later via yfinance when available
        "marketCap": float(config.large_cap_min_usd),
        "capTier": "large",
        "sectorBenchmark": SECTOR_BENCHMARKS[sector_id],
        "active": True,
        "source": "sp500:wikipedia",
    }


def fetch_sp500_constituents(config: PipelineConfig) -> List[Dict[str, Any]]:
    """Pull current S&P 500 constituents from Wikipedia."""

    import pandas as pd
    from urllib.request import Request, urlopen

    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    request = Request(
        url,
        headers={
            "User-Agent": (
                "StockResearchBot/1.0 (personal research; "
                "contact via SEC_IDENTITY_EMAIL in local .env)"
            )
        },
    )
    with urlopen(request, timeout=60) as response:
        html = response.read()
    try:
        tables = pd.read_html(html)
    except ValueError:
        tables = pd.read_html(html, flavor="bs4")
    if not tables:
        raise RuntimeError("Wikipedia returned no tables for S&P 500 constituents")
    frame = tables[0]
    rows: List[Dict[str, Any]] = []
    seen: set[str] = set()
    for record in frame.to_dict(orient="records"):
        row = _row_from_wiki(record, config)
        if row is None or row["ticker"] in seen:
            continue
        seen.add(row["ticker"])
        rows.append(row)
    if len(rows) < 400:
        raise RuntimeError(f"S&P 500 constituent pull looks incomplete ({len(rows)} names)")
    rows.sort(key=lambda item: item["ticker"])
    return rows


def save_universe(rows: List[Dict[str, Any]], path: Optional[Path] = None) -> Path:
    target = path or DEFAULT_UNIVERSE_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schemaVersion": "1.0.0",
        "index": "S&P 500",
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "count": len(rows),
        "constituents": rows,
    }
    target.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return target


def load_universe(path: Optional[Path] = None) -> List[Dict[str, Any]]:
    target = path or DEFAULT_UNIVERSE_PATH
    if not target.is_file():
        raise FileNotFoundError(f"Universe file missing: {target}")
    payload = json.loads(target.read_text(encoding="utf-8"))
    rows = payload.get("constituents") or []
    if not isinstance(rows, list) or not rows:
        raise RuntimeError(f"Universe file has no constituents: {target}")
    return [dict(row) for row in rows]


def refresh_and_save(config: PipelineConfig, path: Optional[Path] = None) -> tuple[Path, int]:
    rows = fetch_sp500_constituents(config)
    target = save_universe(rows, path=path)
    logger.info("Wrote S&P 500 universe (%d names) → %s", len(rows), target)
    return target, len(rows)
