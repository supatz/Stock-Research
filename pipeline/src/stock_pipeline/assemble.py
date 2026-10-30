from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from .comparisons import (
    cross_sectional_percentile,
    historical_percentile,
    market_cohort_label,
    select_sector_cohort,
)
from .config import (
    HISTORICAL_LOOKBACK_DAYS,
    HISTORICAL_MIN_OBSERVATIONS,
    METRIC_MODES,
    METRIC_UNITS,
    PERCENTILE_METRIC_IDS,
    SECTOR_LABELS,
    STATE_LABELS,
    PipelineConfig,
)
from .edgar import empty_financials, merge_key_statistics
from .formatters import (
    format_dollars,
    format_multiple,
    format_number,
    format_percent,
    format_price,
    format_signed_number,
    format_volume,
    round_to,
)
from .states import (
    adx_reading,
    alignment_reading,
    breakout_reading,
    cmf_reading,
    distance_high_reading,
    distance_low_reading,
    drawdown_reading,
    histogram_direction,
    histogram_reading,
    macd_reading,
    relative_strength_reading,
    return_reading,
    risk_bucket,
    rsi_reading,
    slope_reading,
    structure_window_reading,
    volatility_reading,
    volume_reading,
)
from .technicals import series_history


PROVENANCE = "pipeline:v1"
HISTORY_MESSAGE = "Historical percentile unavailable — requires at least 126 valid observations."


def _excess(stock: Optional[float], benchmark: Optional[float]) -> Optional[float]:
    if stock is None or benchmark is None:
        return None
    return stock - benchmark


def _horizons(stock: Dict[str, Any], benchmark: Dict[str, Any]) -> Dict[str, Optional[float]]:
    return {
        "m1": _excess(stock.get("ret_1m"), benchmark.get("ret_1m")),
        "m3": _excess(stock.get("ret_3m"), benchmark.get("ret_3m")),
        "m6": _excess(stock.get("ret_6m"), benchmark.get("ret_6m")),
        "m12": _excess(stock.get("ret_1y"), benchmark.get("ret_1y")),
    }


def _state_label(state: str) -> str:
    return STATE_LABELS.get(state, state)


def _metric_value(latest: Dict[str, Any], key: str) -> Optional[float]:
    value = latest.get(key)
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number:
        return None
    return number


def _observe(
    *,
    metric_id: str,
    as_of: str,
    raw: Any,
    display: str,
    state: str,
    short_text: str,
    quality: str,
    quality_message: Optional[str],
    hist: Optional[Dict[str, Any]],
    sector: Optional[Dict[str, Any]],
    market: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    raw_missing = raw is None
    status = "good"
    message = quality_message
    if raw_missing:
        status = "insufficient"
        message = quality_message or "Not enough data to calculate this metric."
    elif quality == "stale":
        status = "stale"
        message = quality_message or f"Last close is {as_of}."
    elif quality == "insufficient" and metric_id in PERCENTILE_METRIC_IDS:
        status = "insufficient"
        message = HISTORY_MESSAGE
    elif quality == "partial" and metric_id == "volume.cmf-20d":
        status = "partial"
        message = quality_message

    observation: Dict[str, Any] = {
        "metricId": metric_id,
        "asOf": as_of,
        "rawValue": raw if not isinstance(raw, float) else round_to(raw, 4),
        "displayValue": "—" if raw_missing else display,
        "unit": METRIC_UNITS.get(metric_id),
        "interpretation": {
            "mode": METRIC_MODES.get(metric_id, "CATEGORICAL"),
            "state": "UNAVAILABLE" if raw_missing else state,
            "shortText": (message or "Unavailable") if raw_missing else short_text,
        },
        "dataQuality": {"status": status, "message": message},
        "provenance": PROVENANCE,
    }
    if metric_id in PERCENTILE_METRIC_IDS:
        observation["historical"] = hist
        observation["sectorRelative"] = sector
        observation["marketRelative"] = market
    return observation


def _peer_metric(peers: List[Dict[str, Any]], key: str) -> List[Optional[float]]:
    values: List[Optional[float]] = []
    for peer in peers:
        metrics = peer.get("metrics") or {}
        values.append(_metric_value(metrics, key))
    return values


def _hist_for(
    metric_frame: pd.DataFrame,
    column: str,
    config: PipelineConfig,
    sessions: int,
) -> Dict[str, Any]:
    series = series_history(metric_frame, column, config.historical_lookback_days)
    result = historical_percentile(
        series,
        lookback=config.historical_lookback_days,
        min_obs=config.historical_min_observations,
    )
    if sessions < config.historical_min_observations and result.get("percentile") is None:
        result["message"] = HISTORY_MESSAGE
    return result


def _beta_vs_spy(stock_frame: pd.DataFrame, spy_frame: pd.DataFrame) -> Optional[float]:
    if stock_frame.empty or spy_frame.empty:
        return None
    stock_ret = np.log(stock_frame["adj_close"].astype(float)).diff().dropna()
    spy_ret = np.log(spy_frame["adj_close"].astype(float)).diff().dropna()
    joined = pd.concat([stock_ret, spy_ret], axis=1, join="inner").dropna()
    if len(joined) < 60:
        return None
    joined.columns = ["stock", "spy"]
    var = float(joined["spy"].var())
    if var == 0:
        return None
    cov = float(joined["stock"].cov(joined["spy"]))
    return cov / var


def assemble_stock(
    *,
    equity: Dict[str, Any],
    metric_frame: pd.DataFrame,
    latest: Dict[str, Any],
    spy_latest: Dict[str, Any],
    sector_latest: Dict[str, Any],
    spy_frame: pd.DataFrame,
    peers: List[Dict[str, Any]],
    regime: Dict[str, str],
    market_date: str,
    financials: Dict[str, Any],
    config: PipelineConfig,
    quality: str = "good",
    quality_message: Optional[str] = None,
) -> Dict[str, Any]:
    ticker = str(equity["ticker"])
    as_of = str(latest.get("date") or market_date)
    sessions = int(len(metric_frame))
    price = float(latest.get("close") or latest.get("adj_close") or 0.0)
    prev_close = None
    if sessions >= 2:
        prev_close = float(metric_frame["close"].iloc[-2])
    daily_change = price - prev_close if prev_close is not None else 0.0
    daily_change_pct = ((price / prev_close) - 1.0) * 100 if prev_close else 0.0

    vs_spy = _horizons(latest, spy_latest)
    vs_sector = _horizons(latest, sector_latest)
    rs_state, rs_text = relative_strength_reading(vs_spy["m6"], vs_sector["m6"])
    alignment_state, alignment_text = alignment_reading(
        float(latest.get("adj_close") or price),
        _metric_value(latest, "sma20"),
        _metric_value(latest, "sma50"),
        _metric_value(latest, "sma200"),
    )
    rsi_val = _metric_value(latest, "rsi14") or 50.0
    adx_val = _metric_value(latest, "adx") or 0.0
    atr_pct = _metric_value(latest, "atr_pct")
    rvol = _metric_value(latest, "rvol") or 1.0
    rsi_state, rsi_text = rsi_reading(rsi_val)
    adx_state, adx_text = adx_reading(adx_val)
    if atr_pct is None:
        vol_state, vol_text = "UNAVAILABLE", "ATR % is unavailable."
    else:
        vol_state, vol_text = volatility_reading(atr_pct)
    part_state, part_text = volume_reading(rvol)

    high20 = bool(latest.get("high20")) if latest.get("high20") is not None else False
    high55 = bool(latest.get("high55")) if latest.get("high55") is not None else False
    low20 = bool(latest.get("low20")) if latest.get("low20") is not None else False
    low55 = bool(latest.get("low55")) if latest.get("low55") is not None else False
    breakout_kind = (
        ("confirmed" if rvol >= 1.25 else "price-only") if (high20 or high55) else "none"
    )

    sector_cohort = select_sector_cohort(
        peers,
        sector_id=str(equity["sectorId"]),
        cap_tier=str(equity["capTier"]),
        preferred=config.preferred_cohort_size,
        hard_min=config.hard_min_cohort_size,
    )
    market_members = peers
    stale = as_of != market_date or quality == "stale"
    if stale:
        quality = "stale"
        quality_message = quality_message or (
            f"Stale price: last close is {as_of}, before the market date {market_date}."
        )

    def hist(column: str) -> Dict[str, Any]:
        return _hist_for(metric_frame, column, config, sessions)

    def sector_cross(column: str, value: Optional[float]) -> Dict[str, Any]:
        if stale:
            return {
                "percentile": None,
                "cohortLabel": "Excluded — stale price",
                "sampleSize": 0,
                "fallbackLevel": "excluded",
                "fallbackDetail": (
                    "The last close is not the snapshot market date, so this name is left out "
                    "of same-date peer percentiles."
                ),
                "message": "Excluded from same-date peer percentiles.",
            }
        return cross_sectional_percentile(
            value,
            _peer_metric(sector_cohort["members"], column),
            cohort_label=sector_cohort["cohortLabel"],
            fallback_level=sector_cohort.get("fallbackLevel"),
            fallback_detail=sector_cohort.get("fallbackDetail"),
        )

    def market_cross(column: str, value: Optional[float]) -> Dict[str, Any]:
        if stale:
            return {
                "percentile": None,
                "cohortLabel": "Excluded — stale price",
                "sampleSize": 0,
                "fallbackLevel": "excluded",
                "message": "Excluded from same-date peer percentiles.",
            }
        return cross_sectional_percentile(
            value,
            _peer_metric(market_members, column),
            cohort_label=market_cohort_label(),
        )

    def distance_reading(value: Optional[float]):
        if value is None:
            return "UNAVAILABLE", "Distance is unavailable."
        if value >= 0:
            return "PRICE_ABOVE", f"Price is {format_percent(value)} versus this average."
        return "PRICE_BELOW", f"Price is {format_percent(value)} versus this average."

    macd = _metric_value(latest, "macd")
    macd_signal = _metric_value(latest, "macd_signal")
    macd_hist = _metric_value(latest, "macd_histogram")
    prev_hist = None
    if "macd_histogram" in metric_frame.columns and len(metric_frame) >= 2:
        prev = metric_frame["macd_histogram"].iloc[-2]
        prev_hist = None if pd.isna(prev) else float(prev)
    hist_dir = histogram_direction(macd_hist, prev_hist)
    cmf = _metric_value(latest, "cmf20")
    sector_excess_3m = _excess(sector_latest.get("ret_3m"), spy_latest.get("ret_3m"))

    drafts = []

    def add_numeric(metric_id, column, value, display, reading, unavailable=None, hist_col=None):
        state, text = reading if value is not None else ("UNAVAILABLE", "")
        drafts.append(
            {
                "id": metric_id,
                "raw": value,
                "display": display if value is not None else "—",
                "state": state,
                "shortText": text,
                "unavailable": unavailable,
                "histCol": hist_col or column,
                "peerCol": column,
            }
        )

    add_numeric("return.1d", "ret_1d", _metric_value(latest, "ret_1d"), format_percent(_metric_value(latest, "ret_1d")), return_reading(_metric_value(latest, "ret_1d") or 0), "1-day return needs 2 sessions.")
    add_numeric("return.5d", "ret_5d", _metric_value(latest, "ret_5d"), format_percent(_metric_value(latest, "ret_5d")), return_reading(_metric_value(latest, "ret_5d") or 0), "5-day return needs 6 sessions.")
    add_numeric("return.1m", "ret_1m", _metric_value(latest, "ret_1m"), format_percent(_metric_value(latest, "ret_1m")), return_reading(_metric_value(latest, "ret_1m") or 0), "1-month return needs 22 sessions.")
    add_numeric("return.3m", "ret_3m", _metric_value(latest, "ret_3m"), format_percent(_metric_value(latest, "ret_3m")), return_reading(_metric_value(latest, "ret_3m") or 0), "3-month return needs 64 sessions.")
    add_numeric("return.6m", "ret_6m", _metric_value(latest, "ret_6m"), format_percent(_metric_value(latest, "ret_6m")), return_reading(_metric_value(latest, "ret_6m") or 0), "6-month return needs 127 sessions.")
    add_numeric("return.ytd", "ret_ytd", _metric_value(latest, "ret_ytd"), format_percent(_metric_value(latest, "ret_ytd")), return_reading(_metric_value(latest, "ret_ytd") or 0), "Year-to-date return needs a prior-year close.")
    add_numeric("return.1y", "ret_1y", _metric_value(latest, "ret_1y"), format_percent(_metric_value(latest, "ret_1y")), return_reading(_metric_value(latest, "ret_1y") or 0), "1-year return needs 252 sessions.")

    dist_high = _metric_value(latest, "dist_52w_high")
    dist_low = _metric_value(latest, "dist_52w_low")
    add_numeric("distance.52w-high", "dist_52w_high", dist_high, format_percent(dist_high), distance_high_reading(dist_high or 0))
    add_numeric("distance.52w-low", "dist_52w_low", dist_low, format_percent(dist_low), distance_low_reading(dist_low or 0))

    drafts.append(
        {
            "id": "trend.alignment",
            "raw": alignment_state,
            "display": _state_label(alignment_state),
            "state": alignment_state,
            "shortText": alignment_text,
            "unavailable": None,
            "histCol": None,
            "peerCol": None,
        }
    )

    for metric_id, column, digits_msg in (
        ("trend.sma20", "sma20", "SMA 20 needs 20 sessions."),
        ("trend.sma50", "sma50", "SMA 50 needs 50 sessions."),
        ("trend.sma200", "sma200", "SMA 200 unavailable — 200 valid sessions are required."),
    ):
        value = _metric_value(latest, column)
        slope_col = {"sma20": "slope20", "sma50": "slope50", "sma200": "slope200"}[column]
        slope_val = _metric_value(latest, slope_col)
        reading = slope_reading(slope_val) if slope_val is not None else ("UNAVAILABLE", "")
        add_numeric(metric_id, column, value, format_price(value), reading, digits_msg, hist_col=None)

    for metric_id, column in (
        ("trend.dist-sma20", "dist20"),
        ("trend.dist-sma50", "dist50"),
        ("trend.dist-sma200", "dist200"),
    ):
        value = _metric_value(latest, column)
        add_numeric(metric_id, column, value, format_percent(value), distance_reading(value), f"Distance from {column} needs history.")

    for metric_id, column in (
        ("trend.slope-sma20", "slope20"),
        ("trend.slope-sma50", "slope50"),
        ("trend.slope-sma200", "slope200"),
    ):
        value = _metric_value(latest, column)
        add_numeric(metric_id, column, value, format_percent(value, 2), slope_reading(value or 0), f"{metric_id} needs history.")

    add_numeric("trend.adx", "adx", adx_val, format_number(adx_val, 1), (adx_state, adx_text))
    add_numeric("momentum.rsi14", "rsi14", rsi_val, format_number(rsi_val, 1), (rsi_state, rsi_text))

    if macd is not None and macd_signal is not None and macd_hist is not None:
        macd_state, macd_text = macd_reading(macd > macd_signal, macd > 0)
        hist_state, hist_text = histogram_reading(macd_hist, hist_dir)
        add_numeric("momentum.macd", "macd", macd, format_signed_number(macd, 2), (macd_state, macd_text))
        add_numeric(
            "momentum.macd-signal",
            "macd_signal",
            macd_signal,
            format_signed_number(macd_signal, 2),
            ("COUNT", "Signal is the 9-period average of the MACD line."),
        )
        add_numeric(
            "momentum.macd-histogram",
            "macd_histogram",
            macd_hist,
            format_signed_number(macd_hist, 2),
            (hist_state, hist_text),
        )
    else:
        for metric_id in ("momentum.macd", "momentum.macd-signal", "momentum.macd-histogram"):
            add_numeric(metric_id, "macd", None, "—", ("UNAVAILABLE", ""), "MACD needs about 35 sessions.")

    add_numeric("momentum.roc20", "roc20", _metric_value(latest, "roc20"), format_percent(_metric_value(latest, "roc20")), return_reading(_metric_value(latest, "roc20") or 0), "ROC 20D needs 21 sessions.")
    add_numeric("momentum.roc63", "roc63", _metric_value(latest, "roc63"), format_percent(_metric_value(latest, "roc63")), return_reading(_metric_value(latest, "roc63") or 0), "ROC 63D needs 64 sessions.")

    for metric_id, value in (
        ("rs.spy.1m", vs_spy["m1"]),
        ("rs.spy.3m", vs_spy["m3"]),
        ("rs.spy.6m", vs_spy["m6"]),
        ("rs.spy.12m", vs_spy["m12"]),
        ("rs.sector.1m", vs_sector["m1"]),
        ("rs.sector.3m", vs_sector["m3"]),
        ("rs.sector.6m", vs_sector["m6"]),
        ("rs.sector.12m", vs_sector["m12"]),
    ):
        # Peer column uses synthetic keys for RS; store on latest-like via peer map below.
        add_numeric(
            metric_id,
            metric_id,
            value,
            format_percent(value),
            return_reading(value or 0),
            "Relative strength needs overlapping benchmark history.",
            hist_col=None,
        )

    drafts.append(
        {
            "id": "rs.state",
            "raw": rs_state,
            "display": _state_label(rs_state),
            "state": rs_state,
            "shortText": rs_text,
            "unavailable": None,
            "histCol": None,
            "peerCol": None,
        }
    )

    add_numeric("vol.atr-pct", "atr_pct", atr_pct, format_percent(atr_pct, 1, False), (vol_state, vol_text), "ATR % needs 15 sessions.")
    rv20 = _metric_value(latest, "rv20")
    rv60 = _metric_value(latest, "rv60")
    bb = _metric_value(latest, "bb_width")
    add_numeric("vol.realized-20d", "rv20", rv20, format_percent(rv20, 1, False), risk_bucket(rv20 or 0, 14, 24, 38, "20-day realized volatility"), "20-day realized volatility needs 21 sessions.")
    add_numeric("vol.realized-60d", "rv60", rv60, format_percent(rv60, 1, False), risk_bucket(rv60 or 0, 14, 24, 38, "60-day realized volatility"), "60-day realized volatility needs 61 sessions.")
    add_numeric("vol.bb-width", "bb_width", bb, format_percent(bb, 1, False), risk_bucket(bb or 0, 8, 16, 28, "Bollinger width"), "Bollinger width needs 20 sessions.")
    dd = _metric_value(latest, "drawdown")
    mdd = _metric_value(latest, "max_drawdown_1y")
    add_numeric("vol.drawdown", "drawdown", dd, format_percent(dd), drawdown_reading(dd or 0))
    add_numeric("vol.max-drawdown-1y", "max_drawdown_1y", mdd, format_percent(mdd), drawdown_reading(mdd or 0), "1-year maximum drawdown needs a longer history.")

    drafts.append(
        {
            "id": "volume.daily",
            "raw": round_to(_metric_value(latest, "volume"), 0),
            "display": format_volume(_metric_value(latest, "volume")),
            "state": "COUNT",
            "shortText": "Shares traded on the latest session in the snapshot.",
            "unavailable": None,
            "histCol": None,
            "peerCol": None,
        }
    )
    drafts.append(
        {
            "id": "volume.avg-20d",
            "raw": round_to(_metric_value(latest, "avg_volume_20"), 0),
            "display": format_volume(_metric_value(latest, "avg_volume_20")),
            "state": "COUNT",
            "shortText": "Baseline share volume used for relative volume.",
            "unavailable": None,
            "histCol": None,
            "peerCol": None,
        }
    )
    add_numeric("volume.rvol", "rvol", rvol, format_multiple(rvol), (part_state, part_text))
    dollar_avg = _metric_value(latest, "dollar_avg_20")
    drafts.append(
        {
            "id": "volume.dollar-avg-20d",
            "raw": round_to(dollar_avg, 0),
            "display": format_dollars(dollar_avg),
            "state": "COUNT",
            "shortText": "Typical traded dollar value, using the 20-day share average and the latest close.",
            "unavailable": None,
            "histCol": "dollar_avg_20",
            "peerCol": "dollar_avg_20",
        }
    )
    add_numeric(
        "volume.cmf-20d",
        "cmf20",
        cmf,
        format_signed_number(cmf, 2),
        cmf_reading(cmf or 0) if cmf is not None else ("UNAVAILABLE", ""),
        "CMF is unavailable because volume fields were missing. The gap is not filled with zero.",
    )

    s20 = structure_window_reading(high20, low20)
    s55 = structure_window_reading(high55, low55)
    br = breakout_reading(breakout_kind)
    drafts.append(
        {
            "id": "structure.20d",
            "raw": "high" if high20 else ("low" if low20 else "inside"),
            "display": _state_label(s20[0]),
            "state": s20[0],
            "shortText": s20[1],
            "unavailable": None,
            "histCol": None,
            "peerCol": None,
        }
    )
    drafts.append(
        {
            "id": "structure.55d",
            "raw": "high" if high55 else ("low" if low55 else "inside"),
            "display": _state_label(s55[0]),
            "state": s55[0],
            "shortText": s55[1],
            "unavailable": None,
            "histCol": None,
            "peerCol": None,
        }
    )
    drafts.append(
        {
            "id": "structure.breakout",
            "raw": breakout_kind,
            "display": _state_label(br[0]),
            "state": br[0],
            "shortText": br[1],
            "unavailable": None,
            "histCol": None,
            "peerCol": None,
        }
    )
    add_numeric(
        "market.sector-vs-spy",
        "ret_3m",
        sector_excess_3m,
        format_percent(sector_excess_3m),
        return_reading(sector_excess_3m or 0),
    )

    metrics: Dict[str, Dict[str, Any]] = {}
    for draft in drafts:
        metric_id = draft["id"]
        hist_payload = None
        sector_payload = None
        market_payload = None
        if metric_id in PERCENTILE_METRIC_IDS:
            hist_col = draft.get("histCol")
            peer_col = draft.get("peerCol")
            if hist_col and hist_col in metric_frame.columns:
                hist_payload = hist(hist_col)
            else:
                hist_payload = {
                    "percentile": None,
                    "sampleSize": sessions,
                    "lookbackDays": HISTORICAL_LOOKBACK_DAYS,
                    "message": HISTORY_MESSAGE if sessions < HISTORICAL_MIN_OBSERVATIONS else None,
                }
            raw_value = draft["raw"] if isinstance(draft["raw"], (int, float)) else None
            # For RS metrics, peer percentile uses values attached on peer metrics dict.
            if peer_col:
                if metric_id.startswith("rs."):
                    sector_payload = sector_cross(metric_id, raw_value)
                    market_payload = market_cross(metric_id, raw_value)
                else:
                    sector_payload = sector_cross(peer_col, raw_value)
                    market_payload = market_cross(peer_col, raw_value)
            else:
                sector_payload = cross_sectional_percentile(None, [], cohort_label="Unavailable")
                market_payload = cross_sectional_percentile(None, [], cohort_label="Unavailable")

        metrics[metric_id] = _observe(
            metric_id=metric_id,
            as_of=as_of,
            raw=draft["raw"],
            display=draft["display"],
            state=draft["state"],
            short_text=draft["shortText"],
            quality=quality,
            quality_message=draft.get("unavailable") if draft["raw"] is None else quality_message,
            hist=hist_payload,
            sector=sector_payload,
            market=market_payload,
        )

    atr_percentile = None
    atr_metric = metrics.get("vol.atr-pct")
    if atr_metric and atr_metric.get("historical"):
        atr_percentile = atr_metric["historical"].get("percentile")

    summary = {
        "ticker": ticker,
        "company": equity.get("company") or ticker,
        "market": "US",
        "timezone": "America/New_York",
        "currency": "USD",
        "exchange": equity.get("exchange") or "NYSE",
        "sectorId": equity["sectorId"],
        "sector": equity.get("sector") or SECTOR_LABELS[str(equity["sectorId"])],
        "industry": equity.get("industry") or "—",
        "capTier": equity["capTier"],
        "marketCap": float(equity.get("marketCap") or 0),
        "price": round_to(price, 4) or 0.0,
        "dailyChange": round_to(daily_change, 4) or 0.0,
        "dailyChangePct": round_to(daily_change_pct, 4) or 0.0,
        "asOf": as_of,
        "sectorBenchmark": equity.get("sectorBenchmark"),
        "trendState": alignment_state,
        "rsState": rs_state,
        "rsi": round_to(rsi_val, 2) or 0.0,
        "adx": round_to(adx_val, 2) or 0.0,
        "atrPct": round_to(atr_pct, 4),
        "atrPercentile": atr_percentile,
        "rvol": round_to(rvol, 4) or 0.0,
        "return1m": round_to(_metric_value(latest, "ret_1m"), 4),
        "return6mVsSpy": round_to(vs_spy["m6"], 4),
        "distance52wHigh": round_to(dist_high, 4),
        "quality": quality,
        "qualityMessage": quality_message,
    }

    beta = _beta_vs_spy(metric_frame, spy_frame)
    key_statistics = merge_key_statistics(
        market_cap=float(equity.get("marketCap") or 0),
        week52_high=_metric_value(latest, "week52_high"),
        week52_low=_metric_value(latest, "week52_low"),
        vwap=_metric_value(latest, "vwap_20"),
        vwap_vs_price=_metric_value(latest, "vwap_vs_price"),
        beta=beta,
        financials=financials or empty_financials("edgar:missing"),
    )
    vwap_pct = key_statistics.get("vwapVsPricePct")
    if vwap_pct is None:
        vwap_state = "UNAVAILABLE"
        vwap_text = "VWAP is unavailable in this snapshot."
    elif vwap_pct > 0.15:
        vwap_state = "VWAP_ABOVE"
        vwap_text = f"Price is {format_percent(vwap_pct)} versus session VWAP."
    elif vwap_pct < -0.15:
        vwap_state = "VWAP_BELOW"
        vwap_text = f"Price is {format_percent(vwap_pct)} versus session VWAP."
    else:
        vwap_state = "VWAP_AT"
        vwap_text = f"Price is {format_percent(vwap_pct)} versus session VWAP."

    direction = "up" if daily_change_pct >= 0 else "down"
    sector_label = summary["sector"]
    financials_payload = financials or empty_financials("edgar:missing")

    detail = {
        "summary": summary,
        "metrics": metrics,
        "dimensions": [
            {
                "id": "trend",
                "label": "Trend",
                "state": alignment_state,
                "shortText": alignment_text,
                "primary": f"ADX {format_number(adx_val, 1)}",
                "sectionId": "section.stock.trend",
            },
            {
                "id": "momentum",
                "label": "Momentum",
                "state": rsi_state,
                "shortText": rsi_text,
                "primary": f"RSI {format_number(rsi_val, 1)}",
                "sectionId": "section.stock.momentum",
            },
            {
                "id": "relative-strength",
                "label": "Relative Strength",
                "state": rs_state,
                "shortText": rs_text,
                "primary": format_percent(vs_spy["m6"]),
                "sectionId": "section.stock.relative-strength",
            },
            {
                "id": "volatility",
                "label": "Volatility / Risk",
                "state": vol_state,
                "shortText": vol_text,
                "primary": format_percent(atr_pct, 1, False),
                "sectionId": "section.stock.volatility",
            },
            {
                "id": "volume",
                "label": "Volume / Participation",
                "state": part_state,
                "shortText": part_text,
                "primary": format_multiple(rvol),
                "sectionId": "section.stock.volume",
            },
            {
                "id": "vwap",
                "label": "VWAP",
                "state": vwap_state,
                "shortText": vwap_text,
                "primary": format_price(key_statistics.get("vwap")),
                "sectionId": "section.stock.key-statistics",
            },
            {
                "id": "market",
                "label": "Market Context",
                "state": regime["state"],
                "shortText": regime["summary"],
                "primary": regime["label"],
                "sectionId": "section.stock.market-context",
            },
        ],
        "takeaways": {
            "performance": (
                f"Over one month the price is {format_percent(_metric_value(latest, 'ret_1m'))}; "
                f"over six months it is {format_percent(_metric_value(latest, 'ret_6m'))}. "
                "Compare those paths with SPY before treating them as unusual."
            ),
            "trend": alignment_text,
            "momentum": (
                f"{rsi_text} "
                + (
                    histogram_reading(macd_hist, hist_dir)[1]
                    if macd_hist is not None
                    else "MACD is unavailable."
                )
            ),
            "relativeStrength": f"{rs_text} The sector benchmark is {summary['sectorBenchmark']}.",
            "volatility": vol_text,
            "volume": f"{part_text} The latest session was {direction} {format_percent(daily_change_pct)}.",
            "structure": f"{br[1]} Distance from the 52-week high is {format_percent(dist_high)}.",
            "market": (
                f"{regime['summary']} {sector_label} versus SPY over three months is "
                f"{format_percent(sector_excess_3m)}."
            ),
            "financials": financials_payload.get("takeaway")
            or "Financial statements are unavailable for this snapshot.",
        },
        "movingAverages": {
            "sma20": round_to(_metric_value(latest, "sma20"), 4),
            "sma50": round_to(_metric_value(latest, "sma50"), 4),
            "sma200": round_to(_metric_value(latest, "sma200"), 4),
            "dist20": round_to(_metric_value(latest, "dist20"), 4),
            "dist50": round_to(_metric_value(latest, "dist50"), 4),
            "dist200": round_to(_metric_value(latest, "dist200"), 4),
            "slope20": round_to(_metric_value(latest, "slope20"), 4),
            "slope50": round_to(_metric_value(latest, "slope50"), 4),
            "slope200": round_to(_metric_value(latest, "slope200"), 4),
            "alignment": alignment_state,
        },
        "relativeStrength": {
            "state": rs_state,
            "vsSpy": {k: round_to(v, 4) for k, v in vs_spy.items()},
            "vsSector": {k: round_to(v, 4) for k, v in vs_sector.items()},
            "sectorEtf": summary["sectorBenchmark"],
        },
        "structure": {
            "distHigh": round_to(dist_high, 4),
            "distLow": round_to(dist_low, 4),
            "high20": high20,
            "low20": low20,
            "high55": high55,
            "low55": low55,
            "breakout": breakout_kind,
            "drawdown": round_to(dd, 4),
            "maxDrawdown1y": round_to(mdd, 4),
            "windowComplete": sessions >= 252,
        },
        "financials": financials_payload,
        "keyStatistics": key_statistics,
        "sessions": sessions,
    }

    screener = {
        "ticker": summary["ticker"],
        "company": summary["company"],
        "sectorId": summary["sectorId"],
        "sector": summary["sector"],
        "capTier": summary["capTier"],
        "marketCap": summary["marketCap"],
        "price": summary["price"],
        "dailyChangePct": summary["dailyChangePct"],
        "return1m": summary["return1m"],
        "rs6mVsSpy": summary["return6mVsSpy"],
        "trendState": summary["trendState"],
        "rsi": summary["rsi"],
        "adx": summary["adx"],
        "atrPct": summary["atrPct"],
        "atrPercentile": summary["atrPercentile"],
        "rvol": summary["rvol"],
        "distance52wHigh": summary["distance52wHigh"],
        "rsState": summary["rsState"],
        "asOf": summary["asOf"],
        "quality": summary["quality"],
    }

    history = []
    for ts, row in metric_frame.iterrows():
        history.append(
            {
                "date": pd.Timestamp(ts).date().isoformat(),
                "open": round_to(float(row["open"]), 4),
                "high": round_to(float(row["high"]), 4),
                "low": round_to(float(row["low"]), 4),
                "close": round_to(float(row["close"]), 4),
                "volume": round_to(float(row["volume"]), 0),
                "sma20": round_to(None if pd.isna(row["sma20"]) else float(row["sma20"]), 4),
                "sma50": round_to(None if pd.isna(row["sma50"]) else float(row["sma50"]), 4),
                "sma200": round_to(None if pd.isna(row["sma200"]) else float(row["sma200"]), 4),
            }
        )

    return {
        "summary": summary,
        "detail": detail,
        "screener": screener,
        "history": history,
        "latest": latest,
        "vsSpy": vs_spy,
        "vsSector": vs_sector,
    }
