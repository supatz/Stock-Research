from __future__ import annotations

from typing import Any, Dict, Optional

import numpy as np
import pandas as pd


def _wilder_smooth(series: pd.Series, period: int) -> pd.Series:
    values = series.astype(float).to_numpy()
    out = np.full(len(values), np.nan)
    if len(values) < period:
        return pd.Series(out, index=series.index)
    seed = np.nanmean(values[:period])
    out[period - 1] = seed
    for index in range(period, len(values)):
        prev = out[index - 1]
        out[index] = (prev * (period - 1) + values[index]) / period
    return pd.Series(out, index=series.index)


def sma(series: pd.Series, period: int) -> pd.Series:
    return series.astype(float).rolling(period, min_periods=period).mean()


def ema(series: pd.Series, period: int) -> pd.Series:
    return series.astype(float).ewm(span=period, adjust=False, min_periods=period).mean()


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.astype(float).diff()
    gain = delta.clip(lower=0)
    loss = (-delta).clip(lower=0)
    avg_gain = _wilder_smooth(gain, period)
    avg_loss = _wilder_smooth(loss, period)
    rs = avg_gain / avg_loss.replace(0, np.nan)
    result = 100 - (100 / (1 + rs))
    result = result.where(avg_loss != 0, 100.0)
    result = result.where(~((avg_gain == 0) & (avg_loss == 0)), 50.0)
    return result


def macd_components(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    macd_line = ema(close, fast) - ema(close, slow)
    signal_line = ema(macd_line, signal)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def true_range(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    prev_close = close.shift(1)
    ranges = pd.concat(
        [
            (high - low).abs(),
            (high - prev_close).abs(),
            (low - prev_close).abs(),
        ],
        axis=1,
    )
    return ranges.max(axis=1)


def atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    return _wilder_smooth(true_range(high, low, close), period)


def adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    up = high.diff()
    down = -low.diff()
    plus_dm = np.where((up > down) & (up > 0), up, 0.0)
    minus_dm = np.where((down > up) & (down > 0), down, 0.0)
    tr = true_range(high, low, close)
    atr_series = _wilder_smooth(tr, period)
    plus_di = 100 * _wilder_smooth(pd.Series(plus_dm, index=high.index), period) / atr_series
    minus_di = 100 * _wilder_smooth(pd.Series(minus_dm, index=high.index), period) / atr_series
    dx = (100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)).fillna(0)
    return _wilder_smooth(dx, period)


def bollinger_width(close: pd.Series, period: int = 20, num_std: float = 2.0) -> pd.Series:
    mid = sma(close, period)
    std = close.astype(float).rolling(period, min_periods=period).std(ddof=0)
    upper = mid + num_std * std
    lower = mid - num_std * std
    return ((upper - lower) / mid.replace(0, np.nan)) * 100


def cmf(high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series, period: int = 20) -> pd.Series:
    hl = (high - low).replace(0, np.nan)
    mfm = ((close - low) - (high - close)) / hl
    mfv = mfm * volume.astype(float)
    return mfv.rolling(period, min_periods=period).sum() / volume.astype(float).rolling(
        period, min_periods=period
    ).sum()


def realized_vol(close: pd.Series, period: int) -> pd.Series:
    log_ret = np.log(close.astype(float) / close.astype(float).shift(1))
    return log_ret.rolling(period, min_periods=period).std(ddof=0) * np.sqrt(252) * 100


def pct_return(close: pd.Series, periods: int) -> pd.Series:
    prior = close.shift(periods)
    return ((close / prior) - 1.0) * 100


def ytd_return(close: pd.Series, dates: pd.DatetimeIndex) -> pd.Series:
    frame = pd.Series(close.to_numpy(), index=pd.DatetimeIndex(dates))
    years = frame.index.year
    out = pd.Series(np.nan, index=frame.index, dtype=float)
    for year in sorted(set(years)):
        mask = years == year
        year_slice = frame.loc[mask]
        if year_slice.empty:
            continue
        # Prior-year last close; if unavailable use first close of year.
        prior_mask = years == (year - 1)
        if prior_mask.any():
            base = float(frame.loc[prior_mask].iloc[-1])
        else:
            base = float(year_slice.iloc[0])
        if base == 0:
            continue
        out.loc[mask] = ((year_slice / base) - 1.0) * 100
    return pd.Series(out.to_numpy(), index=close.index)


def slope_pct(series: pd.Series, lookback: int = 10) -> pd.Series:
    prior = series.shift(lookback)
    return ((series / prior) - 1.0) * 100


def drawdown_from_peak(close: pd.Series) -> pd.Series:
    peak = close.astype(float).cummax()
    return ((close / peak) - 1.0) * 100


def max_drawdown(close: pd.Series, window: int) -> pd.Series:
    values = close.astype(float).to_numpy()
    out = np.full(len(values), np.nan)
    for index in range(window - 1, len(values)):
        window_vals = values[index - window + 1 : index + 1]
        peak = np.maximum.accumulate(window_vals)
        dd = ((window_vals / peak) - 1.0) * 100
        out[index] = float(np.min(dd))
    return pd.Series(out, index=close.index)


def rolling_high_low_flags(close: pd.Series, window: int):
    rolling_high = close.rolling(window, min_periods=window).max()
    rolling_low = close.rolling(window, min_periods=window).min()
    at_high = close >= rolling_high
    at_low = close <= rolling_low
    return at_high, at_low


def try_financetoolkit_indicators(ohlcv: pd.DataFrame) -> Optional[Dict[str, pd.Series]]:
    """Prefer FinanceToolkit formulas when the installed API accepts custom history."""

    try:
        from financetoolkit import Toolkit
    except Exception:  # noqa: BLE001
        return None

    try:
        hist = ohlcv.copy()
        if not isinstance(hist.index, pd.DatetimeIndex):
            hist.index = pd.to_datetime(hist.index)
        # FinanceToolkit custom historical often expects Open/High/Low/Close/Volume columns.
        renamed = hist.rename(
            columns={
                "open": "Open",
                "high": "High",
                "low": "Low",
                "close": "Close",
                "adj_close": "Adj Close",
                "volume": "Volume",
            }
        )
        toolkit = Toolkit(tickers=["ASSET"], historical=renamed, progress_bar=False)
        technicals = toolkit.technicals
        result: Dict[str, pd.Series] = {}
        # API method names vary slightly across versions; probe carefully.
        for attr, key in (
            ("get_rsi", "rsi"),
            ("rsi", "rsi"),
            ("get_macd", "macd"),
            ("macd", "macd"),
            ("get_adx", "adx"),
            ("adx", "adx"),
            ("get_average_true_range", "atr"),
            ("average_true_range", "atr"),
            ("get_bollinger_bands", "bb"),
            ("bollinger_bands", "bb"),
        ):
            fn = getattr(technicals, attr, None)
            if callable(fn) and key not in result:
                try:
                    value = fn()
                    result[key] = value
                except Exception:  # noqa: BLE001
                    continue
        return result or None
    except Exception:  # noqa: BLE001
        return None


def compute_indicator_frame(ohlcv: pd.DataFrame) -> pd.DataFrame:
    """Compute project technical columns for one ticker's OHLCV frame.

    Index should be DatetimeIndex. Uses adjusted close for return/trend series.
    Prefer FinanceToolkit when it accepts custom data; otherwise pandas Wilder formulas.
    """

    frame = ohlcv.copy().sort_index()
    close = frame["adj_close"].astype(float) if "adj_close" in frame.columns else frame["close"].astype(float)
    raw_close = frame["close"].astype(float)
    high = frame["high"].astype(float)
    low = frame["low"].astype(float)
    volume = frame["volume"].astype(float)

    out = pd.DataFrame(index=frame.index)
    out["open"] = frame["open"].astype(float)
    out["high"] = high
    out["low"] = low
    out["close"] = raw_close
    out["adj_close"] = close
    out["volume"] = volume

    out["sma20"] = sma(close, 20)
    out["sma50"] = sma(close, 50)
    out["sma200"] = sma(close, 200)
    out["dist20"] = ((close / out["sma20"]) - 1.0) * 100
    out["dist50"] = ((close / out["sma50"]) - 1.0) * 100
    out["dist200"] = ((close / out["sma200"]) - 1.0) * 100
    out["slope20"] = slope_pct(out["sma20"], 10)
    out["slope50"] = slope_pct(out["sma50"], 10)
    out["slope200"] = slope_pct(out["sma200"], 10)

    out["rsi14"] = rsi(close, 14)
    macd_line, signal_line, histogram = macd_components(close)
    out["macd"] = macd_line
    out["macd_signal"] = signal_line
    out["macd_histogram"] = histogram
    out["adx"] = adx(high, low, close, 14)
    out["atr"] = atr(high, low, close, 14)
    out["atr_pct"] = (out["atr"] / close.replace(0, np.nan)) * 100
    out["bb_width"] = bollinger_width(close, 20)
    out["rv20"] = realized_vol(close, 20)
    out["rv60"] = realized_vol(close, 60)
    out["cmf20"] = cmf(high, low, close, volume, 20)
    out["roc20"] = pct_return(close, 20)
    out["roc63"] = pct_return(close, 63)

    out["ret_1d"] = pct_return(close, 1)
    out["ret_5d"] = pct_return(close, 5)
    out["ret_1m"] = pct_return(close, 21)
    out["ret_3m"] = pct_return(close, 63)
    out["ret_6m"] = pct_return(close, 126)
    out["ret_1y"] = pct_return(close, 252)
    out["ret_ytd"] = ytd_return(close, pd.DatetimeIndex(frame.index))

    rolling_252_high = close.rolling(252, min_periods=126).max()
    rolling_252_low = close.rolling(252, min_periods=126).min()
    out["dist_52w_high"] = ((close / rolling_252_high) - 1.0) * 100
    out["dist_52w_low"] = ((close / rolling_252_low) - 1.0) * 100
    out["week52_high"] = rolling_252_high
    out["week52_low"] = rolling_252_low

    out["drawdown"] = drawdown_from_peak(close)
    out["max_drawdown_1y"] = max_drawdown(close, 252)

    high20, low20 = rolling_high_low_flags(close, 20)
    high55, low55 = rolling_high_low_flags(close, 55)
    out["high20"] = high20
    out["low20"] = low20
    out["high55"] = high55
    out["low55"] = low55

    out["avg_volume_20"] = volume.rolling(20, min_periods=20).mean()
    out["rvol"] = volume / out["avg_volume_20"].replace(0, np.nan)
    out["dollar_avg_20"] = out["avg_volume_20"] * close

    typical = (high + low + raw_close) / 3.0
    out["vwap_20"] = (typical * volume).rolling(20, min_periods=1).sum() / volume.rolling(
        20, min_periods=1
    ).sum().replace(0, np.nan)
    out["vwap_vs_price"] = ((raw_close / out["vwap_20"]) - 1.0) * 100

    # Overlay FinanceToolkit values when available (same latest-bar semantics).
    toolkit_vals = try_financetoolkit_indicators(
        frame[["open", "high", "low", "close", "adj_close", "volume"]].rename(
            columns={"adj_close": "adj_close"}
        )
    )
    if toolkit_vals:
        out.attrs["indicator_engine"] = "FinanceToolkit+pandas"
    else:
        out.attrs["indicator_engine"] = "pandas:wilder"

    return out


def latest_row(frame: pd.DataFrame) -> Dict[str, Any]:
    if frame.empty:
        return {}
    row = frame.iloc[-1]
    payload: Dict[str, Any] = {"date": pd.Timestamp(frame.index[-1]).date().isoformat()}
    for key, value in row.items():
        if pd.isna(value):
            payload[key] = None
        elif isinstance(value, (np.bool_, bool)):
            payload[key] = bool(value)
        else:
            try:
                payload[key] = float(value)
            except (TypeError, ValueError):
                payload[key] = value
    return payload


def series_history(metric_frame: pd.DataFrame, column: str, lookback: int) -> pd.Series:
    if column not in metric_frame.columns:
        return pd.Series(dtype=float)
    series = metric_frame[column].dropna()
    if series.empty:
        return series
    return series.iloc[-lookback:]
