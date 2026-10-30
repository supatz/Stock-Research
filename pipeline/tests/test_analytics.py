import pandas as pd

from stock_pipeline.comparisons import (
    historical_percentile,
    percentile_rank,
    select_sector_cohort,
)
from stock_pipeline.states import (
    alignment_reading,
    relative_strength_reading,
    rsi_reading,
    volatility_reading,
    volume_reading,
)
from stock_pipeline.technicals import atr, compute_indicator_frame, rsi, sma


def test_percentile_rank_midpoint():
    assert percentile_rank(5, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) == 45.0


def test_historical_percentile_requires_min_observations():
    series = pd.Series(range(50), index=pd.date_range("2024-01-01", periods=50, freq="B"))
    result = historical_percentile(series, lookback=504, min_obs=126)
    assert result["percentile"] is None
    assert result["sampleSize"] == 50


def test_historical_percentile_with_enough_history():
    series = pd.Series(
        list(range(200)),
        index=pd.date_range("2024-01-01", periods=200, freq="B"),
    )
    result = historical_percentile(series, lookback=504, min_obs=126)
    assert result["percentile"] is not None
    assert result["sampleSize"] == 200


def test_sector_cohort_fallback_to_sector():
    peers = [
        {"ticker": f"T{i}", "sectorId": "utilities", "capTier": "large"} for i in range(25)
    ] + [{"ticker": "M1", "sectorId": "utilities", "capTier": "mega"}]
    selected = select_sector_cohort(peers, sector_id="utilities", cap_tier="large", preferred=30, hard_min=20)
    assert selected["fallbackLevel"] == "sector"
    assert selected["cohortLabel"] == "Utilities"
    assert len(selected["members"]) == 26


def test_alignment_and_rsi_states():
    state, _ = alignment_reading(110, 105, 100, 90)
    assert state == "STRONG_UPTREND"
    state, _ = rsi_reading(72)
    assert state == "MOMENTUM_EXTENDED"
    state, _ = relative_strength_reading(3.0, 2.0)
    assert state == "LEADING_MARKET_AND_SECTOR"
    state, _ = volatility_reading(2.5)
    assert state == "VOL_ELEVATED"
    state, _ = volume_reading(2.4)
    assert state == "PARTICIPATION_EXCEPTIONAL"


def test_sma_rsi_atr_on_synthetic_ohlcv():
    dates = pd.date_range("2023-01-01", periods=80, freq="B")
    close = pd.Series([100 + i * 0.2 for i in range(80)], index=dates)
    high = close + 1
    low = close - 1
    open_ = close.shift(1).fillna(close.iloc[0])
    volume = pd.Series([1_000_000] * 80, index=dates)
    frame = pd.DataFrame(
        {
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "adj_close": close,
            "volume": volume,
        },
        index=dates,
    )
    assert sma(close, 20).iloc[-1] > 0
    assert 0 < rsi(close, 14).iloc[-1] <= 100
    assert atr(high, low, close, 14).iloc[-1] > 0
    metrics = compute_indicator_frame(frame)
    assert "sma20" in metrics.columns
    assert "rsi14" in metrics.columns
    assert metrics["rvol"].iloc[-1] is not None
