from __future__ import annotations

from typing import Any, Dict, List, Sequence

from .config import SECTOR_BENCHMARKS, always_include_tickers


def build_quality_report(
    *,
    market_date: str,
    generated_at: str,
    pipeline_version: str,
    data_sources: List[str],
    equities: Sequence[Dict[str, Any]],
    built_tickers: Sequence[str],
    benchmark_latest: Dict[str, Dict[str, Any]],
    warnings: List[str],
) -> Dict[str, Any]:
    fatal: List[str] = []
    soft: List[str] = list(warnings)

    if "SPY" not in benchmark_latest:
        fatal.append("SPY data is missing — cannot publish a market snapshot.")

    missing_sectors = [
        etf for etf in SECTOR_BENCHMARKS.values() if etf not in benchmark_latest
    ]
    if missing_sectors:
        soft.append(f"Missing sector benchmarks: {', '.join(missing_sectors)}")

    for ticker in always_include_tickers():
        if ticker == "SPY":
            continue
        if ticker not in benchmark_latest and ticker not in ("QQQ", "DIA", "IWM"):
            continue
        if ticker in ("QQQ", "DIA", "IWM") and ticker not in benchmark_latest:
            soft.append(f"Index benchmark {ticker} is missing.")

    target = len(equities)
    built = len(built_tickers)
    coverage = (built / target) if target else 0.0
    if target and coverage < 0.6:
        fatal.append(
            f"Only {built}/{target} equities ({coverage:.0%}) produced a valid latest close."
        )
    elif target and coverage < 0.95:
        soft.append(
            f"Equity coverage is {built}/{target} ({coverage:.0%}); preferred threshold is 95%."
        )

    stale = [
        row["ticker"]
        for row in equities
        if row["ticker"] in built_tickers
        and (benchmark_latest.get(row["ticker"]) or {}).get("date") not in {None, market_date}
    ]
    # Stale equities tracked via built summaries elsewhere; keep check informative.
    duplicate_tickers = len(built_tickers) != len(set(built_tickers))
    if duplicate_tickers:
        fatal.append("Duplicate tickers detected in built universe.")

    status = "ok"
    if fatal:
        status = "fatal"
    elif soft:
        status = "warning"

    return {
        "schemaVersion": "1.0.0",
        "marketDate": market_date,
        "generatedAt": generated_at,
        "pipelineVersion": pipeline_version,
        "dataSources": data_sources,
        "payload": {
            "status": status,
            "fatalErrors": fatal,
            "warnings": soft,
            "checks": {
                "manifestGenerated": True,
                "spyPresent": "SPY" in benchmark_latest,
                "sectorBenchmarksConfigured": len(SECTOR_BENCHMARKS) == 11,
                "sectorBenchmarksPresent": len(missing_sectors) == 0,
                "equityCoverage": round(coverage, 4),
                "equityBuilt": built,
                "equityTarget": target,
                "staleCandidates": len(stale),
                "duplicateTickers": duplicate_tickers,
            },
        },
    }
