from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Sequence

import numpy as np
import pandas as pd

from .config import (
    HARD_MIN_COHORT_SIZE,
    HISTORICAL_LOOKBACK_DAYS,
    HISTORICAL_MIN_OBSERVATIONS,
    PREFERRED_COHORT_SIZE,
    SECTOR_LABELS,
    PipelineConfig,
)


def percentile_rank(value: float, cohort: Sequence[float]) -> Optional[float]:
    """Percent of cohort strictly below value, plus half the ties (average rank style)."""

    if not cohort:
        return None
    arr = np.asarray(list(cohort), dtype=float)
    arr = arr[np.isfinite(arr)]
    if arr.size == 0:
        return None
    below = np.sum(arr < value)
    equal = np.sum(arr == value)
    return float((below + 0.5 * equal) / arr.size * 100)


def historical_percentile(
    series: pd.Series,
    *,
    lookback: int = HISTORICAL_LOOKBACK_DAYS,
    min_obs: int = HISTORICAL_MIN_OBSERVATIONS,
) -> Dict[str, Any]:
    clean = series.dropna().astype(float)
    sample = clean.iloc[-lookback:] if len(clean) else clean
    sample_size = int(len(sample))
    start_date = None
    if sample_size:
        start_date = pd.Timestamp(sample.index[0]).date().isoformat()
    if sample_size < min_obs:
        return {
            "percentile": None,
            "sampleSize": sample_size,
            "lookbackDays": lookback,
            "startDate": start_date,
            "message": "Historical percentile unavailable — requires at least 126 valid observations.",
        }
    latest = float(sample.iloc[-1])
    return {
        "percentile": round(percentile_rank(latest, sample.to_list()) or 0.0, 1),
        "sampleSize": sample_size,
        "lookbackDays": lookback,
        "startDate": start_date,
    }


def select_sector_cohort(
    peers: List[Dict[str, Any]],
    *,
    sector_id: str,
    cap_tier: str,
    preferred: int = PREFERRED_COHORT_SIZE,
    hard_min: int = HARD_MIN_COHORT_SIZE,
) -> Dict[str, Any]:
    sector_label = SECTOR_LABELS.get(sector_id, sector_id)
    tier_label = "Mega Cap" if cap_tier == "mega" else "Large Cap"

    same_sector_size = [
        peer for peer in peers if peer.get("sectorId") == sector_id and peer.get("capTier") == cap_tier
    ]
    if len(same_sector_size) >= preferred:
        return {
            "members": same_sector_size,
            "cohortLabel": f"{sector_label} / {tier_label}",
            "fallbackLevel": None,
            "fallbackDetail": None,
        }

    same_sector = [peer for peer in peers if peer.get("sectorId") == sector_id]
    if len(same_sector) >= hard_min:
        return {
            "members": same_sector,
            "cohortLabel": sector_label,
            "fallbackLevel": "sector",
            "fallbackDetail": (
                f"{sector_label} / {tier_label} had n={len(same_sector_size)}, "
                f"below the preferred minimum of {preferred}."
            ),
        }

    same_size = [peer for peer in peers if peer.get("capTier") == cap_tier]
    if len(same_size) >= hard_min:
        return {
            "members": same_size,
            "cohortLabel": f"US {tier_label}",
            "fallbackLevel": "size",
            "fallbackDetail": (
                f"{sector_label} cohort had n={len(same_sector)}, below the minimum of {hard_min}."
            ),
        }

    return {
        "members": list(peers),
        "cohortLabel": "US Large/Mega Cap",
        "fallbackLevel": "market",
        "fallbackDetail": "Fell back to the broad large/mega universe.",
    }


def cross_sectional_percentile(
    value: Optional[float],
    cohort_values: Iterable[Optional[float]],
    *,
    cohort_label: str,
    fallback_level: Optional[str] = None,
    fallback_detail: Optional[str] = None,
) -> Dict[str, Any]:
    if value is None:
        return {
            "percentile": None,
            "cohortLabel": "Unavailable",
            "sampleSize": 0,
            "message": "Peer percentile needs a raw value.",
        }
    clean = [float(item) for item in cohort_values if item is not None and np.isfinite(item)]
    if not clean:
        return {
            "percentile": None,
            "cohortLabel": cohort_label,
            "sampleSize": 0,
            "fallbackLevel": fallback_level,
            "fallbackDetail": fallback_detail,
            "message": "Peer cohort has no valid observations for this metric.",
        }
    return {
        "percentile": round(percentile_rank(float(value), clean) or 0.0, 1),
        "cohortLabel": cohort_label,
        "sampleSize": len(clean),
        "fallbackLevel": fallback_level,
        "fallbackDetail": fallback_detail,
    }


def market_cohort_label() -> str:
    return "US Large/Mega Cap"


def build_peer_snapshot(
    equities: List[Dict[str, Any]],
    latest_by_ticker: Dict[str, Dict[str, Any]],
    market_date: str,
    config: PipelineConfig,
) -> List[Dict[str, Any]]:
    """Same-date eligible peer rows for cross-sectional percentiles."""

    peers: List[Dict[str, Any]] = []
    for row in equities:
        ticker = str(row["ticker"])
        latest = latest_by_ticker.get(ticker)
        if not latest:
            continue
        if latest.get("date") != market_date:
            continue
        peers.append(
            {
                **row,
                "metrics": latest,
            }
        )
    return peers
