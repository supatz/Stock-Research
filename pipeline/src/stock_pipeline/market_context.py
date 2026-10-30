from __future__ import annotations

from typing import Any, Dict, List, Optional

from .config import INDEX_BENCHMARKS, SECTOR_BENCHMARKS, SECTOR_ETF_NAMES, SECTOR_LABELS, METRIC_MODES
from .formatters import format_number, format_percent, round_to
from .states import (
    above_average_reading,
    breadth_reading,
    derive_regime,
    new_high_low_reading,
    vix_reading,
)


def count_breadth(summaries: List[Dict[str, Any]], details: List[Dict[str, Any]]) -> Dict[str, Any]:
    by_ticker = {item["summary"]["ticker"]: item for item in details}
    eligible = [s for s in summaries if s.get("quality") != "stale"]
    with50 = []
    above50 = []
    with200 = []
    above200 = []
    highs20 = 0
    lows20 = 0
    for summary in eligible:
        detail = by_ticker.get(summary["ticker"])
        if not detail:
            continue
        ma = detail["movingAverages"]
        structure = detail["structure"]
        if ma.get("sma50") is not None:
            with50.append(summary)
            if (ma.get("dist50") or 0) > 0:
                above50.append(summary)
        if ma.get("sma200") is not None:
            with200.append(summary)
            if (ma.get("dist200") or 0) > 0:
                above200.append(summary)
        if structure.get("high20"):
            highs20 += 1
        if structure.get("low20"):
            lows20 += 1
    return {
        "above50": (len(above50) / len(with50) * 100) if with50 else None,
        "above50Count": len(above50),
        "above50Sample": len(with50),
        "above200": (len(above200) / len(with200) * 100) if with200 else None,
        "above200Count": len(above200),
        "above200Sample": len(with200),
        "highs20": highs20,
        "lows20": lows20,
        "illustrated": len(eligible),
    }


def _market_observe(
    metric_id: str,
    as_of: str,
    raw: Any,
    display: str,
    state: str,
    short_text: str,
    historical: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "metricId": metric_id,
        "asOf": as_of,
        "rawValue": raw,
        "displayValue": display,
        "unit": "%" if "dma" in metric_id or "breadth" in metric_id else None,
        "interpretation": {
            "mode": METRIC_MODES.get(metric_id, "CATEGORICAL"),
            "state": state,
            "shortText": short_text,
        },
        "dataQuality": {"status": "good"},
        "provenance": "pipeline:v1",
    }
    if historical is not None:
        payload["historical"] = historical
    return payload


def build_market_overview(
    *,
    as_of: str,
    generated_at: str,
    equity_details: List[Dict[str, Any]],
    benchmark_latest: Dict[str, Dict[str, Any]],
    vix_level: Optional[float],
) -> Dict[str, Any]:
    summaries = [item["summary"] for item in equity_details]
    breadth = count_breadth(summaries, equity_details)
    spy = benchmark_latest.get("SPY") or {}
    qqq = benchmark_latest.get("QQQ") or {}
    spy_dist50 = spy.get("dist50")
    spy_dist200 = spy.get("dist200")
    qqq_dist200 = qqq.get("dist200")
    regime = derive_regime(
        (spy_dist50 or -1) >= 0,
        (spy_dist200 or -1) >= 0,
        (qqq_dist200 or -1) >= 0,
        breadth["above50"] or 0,
        breadth["above200"] or 0,
    )

    indices = []
    for ticker, name in INDEX_BENCHMARKS:
        latest = benchmark_latest.get(ticker) or {}
        alignment = "MIXED"
        price = float(latest.get("close") or 0)
        sma20 = latest.get("sma20")
        sma50 = latest.get("sma50")
        sma200 = latest.get("sma200")
        from .states import alignment_reading

        alignment, _ = alignment_reading(float(latest.get("adj_close") or price), sma20, sma50, sma200)
        indices.append(
            {
                "ticker": ticker,
                "name": name,
                "price": round_to(price, 4) or 0.0,
                "changePct": round_to(latest.get("ret_1d"), 4) or 0.0,
                "vs50": round_to(latest.get("dist50"), 4),
                "vs200": round_to(latest.get("dist200"), 4),
                "trendState": alignment,
            }
        )

    sectors = []
    spy_ret3m = spy.get("ret_3m")
    for sector_id, etf in SECTOR_BENCHMARKS.items():
        latest = benchmark_latest.get(etf) or {}
        from .states import alignment_reading

        price = float(latest.get("close") or 0)
        alignment, _ = alignment_reading(
            float(latest.get("adj_close") or price),
            latest.get("sma20"),
            latest.get("sma50"),
            latest.get("sma200"),
        )
        rs3m = None
        if latest.get("ret_3m") is not None and spy_ret3m is not None:
            rs3m = float(latest["ret_3m"]) - float(spy_ret3m)
        sectors.append(
            {
                "ticker": etf,
                "sectorId": sector_id,
                "name": SECTOR_LABELS[sector_id],
                "changePct": round_to(latest.get("ret_1d"), 4) or 0.0,
                "return1m": round_to(latest.get("ret_1m"), 4),
                "rs3mVsSpy": round_to(rs3m, 4),
                "trendState": alignment,
            }
        )
    sectors.sort(key=lambda row: row["rs3mVsSpy"] if row["rs3mVsSpy"] is not None else -999, reverse=True)

    breadth50 = breadth["above50"] or 0
    breadth200 = breadth["above200"] or 0
    b50_state, b50_text = breadth_reading(breadth50)
    b200_state, b200_text = breadth_reading(breadth200)
    high_low_state, high_low_text = new_high_low_reading(breadth["highs20"], breadth["lows20"])
    spy50_state, spy50_text = above_average_reading(spy_dist50 or 0)
    spy200_state, spy200_text = above_average_reading(spy_dist200 or 0)
    qqq200_state, qqq200_text = above_average_reading(qqq_dist200 or 0)

    vix = vix_level
    vix_hist = None
    if vix is None:
        vix_metric = _market_observe(
            "market.vix",
            as_of,
            None,
            "—",
            "UNAVAILABLE",
            "VIX is unavailable from the selected market-data source.",
        )
    else:
        vix_state, vix_text = vix_reading(vix)
        vix_metric = _market_observe(
            "market.vix",
            as_of,
            round_to(vix, 2),
            format_number(vix, 1),
            vix_state,
            vix_text,
            vix_hist,
        )

    metrics = [
        _market_observe("market.regime", as_of, regime["state"], regime["label"], regime["state"], regime["summary"]),
        _market_observe(
            "market.spy-vs-50dma",
            as_of,
            round_to(spy_dist50, 2),
            format_percent(spy_dist50),
            spy50_state,
            spy50_text,
        ),
        _market_observe(
            "market.spy-vs-200dma",
            as_of,
            round_to(spy_dist200, 2),
            format_percent(spy_dist200),
            spy200_state,
            spy200_text,
        ),
        _market_observe(
            "market.qqq-vs-200dma",
            as_of,
            round_to(qqq_dist200, 2),
            format_percent(qqq_dist200),
            qqq200_state,
            qqq200_text,
        ),
        _market_observe(
            "market.breadth-50dma",
            as_of,
            round_to(breadth["above50"], 1),
            f"{format_percent(breadth['above50'], 0, False)} · {breadth['above50Count']} of {breadth['above50Sample']}",
            b50_state,
            b50_text,
        ),
        _market_observe(
            "market.breadth-200dma",
            as_of,
            round_to(breadth["above200"], 1),
            f"{format_percent(breadth['above200'], 0, False)} · {breadth['above200Count']} of {breadth['above200Sample']}",
            b200_state,
            b200_text,
        ),
        vix_metric,
        _market_observe(
            "market.highs-20d",
            as_of,
            breadth["highs20"],
            str(breadth["highs20"]),
            high_low_state,
            high_low_text,
        ),
        _market_observe(
            "market.lows-20d",
            as_of,
            breadth["lows20"],
            str(breadth["lows20"]),
            high_low_state,
            high_low_text,
        ),
    ]

    return {
        "asOf": as_of,
        "generatedAt": generated_at,
        "regime": regime,
        "metrics": metrics,
        "indices": indices,
        "sectors": sectors,
        "breadth": breadth,
    }


def etf_display_name(ticker: str) -> str:
    return SECTOR_ETF_NAMES.get(ticker, ticker)
