from __future__ import annotations

from typing import Dict, Optional, Tuple


Reading = Tuple[str, str]


def _side(value: float) -> str:
    if value > 0.5:
        return "up"
    if value < -0.5:
        return "down"
    return "flat"


def relative_strength_reading(
    vs_spy_6m: Optional[float], vs_sector_6m: Optional[float]
) -> Reading:
    if vs_spy_6m is None or vs_sector_6m is None:
        return (
            "INSUFFICIENT",
            "A 6-month relative-strength state needs 126 sessions.",
        )
    spy = _side(vs_spy_6m)
    sector = _side(vs_sector_6m)
    if spy == "up" and sector == "up":
        state = "LEADING_MARKET_AND_SECTOR"
        text = "6-month performance is ahead of both SPY and the sector ETF."
    elif spy == "up" and sector != "up":
        state = "LEADING_MARKET"
        text = "6-month performance is ahead of SPY and behind or only in line with the sector ETF."
    elif spy != "up" and sector == "up":
        state = "LEADING_SECTOR"
        text = "6-month performance is ahead of the sector ETF without leading SPY."
    elif spy == "down" or sector == "down":
        state = "LAGGING"
        text = "6-month performance is behind SPY, the sector ETF, or both."
    else:
        state = "IN_LINE"
        text = "6-month performance is close to both benchmarks."
    return state, text


def alignment_reading(
    price: float,
    sma20: Optional[float],
    sma50: Optional[float],
    sma200: Optional[float],
) -> Reading:
    if sma20 is None or sma50 is None or sma200 is None:
        return (
            "INSUFFICIENT",
            "Alignment needs a 20-day, 50-day, and 200-day average.",
        )
    if price > sma20 > sma50 > sma200:
        return (
            "STRONG_UPTREND",
            "Price > SMA20 > SMA50 > SMA200. The averages are stacked upward.",
        )
    if price < sma20 < sma50 < sma200:
        return (
            "STRONG_DOWNTREND",
            "Price < SMA20 < SMA50 < SMA200. The averages are stacked downward.",
        )
    if price > sma50 > sma200:
        return (
            "UPTREND",
            "Price is above the 50- and 200-day averages, with mixed short-term alignment.",
        )
    if price < sma50 < sma200:
        return ("DOWNTREND", "Price is below the 50- and 200-day averages.")
    return ("MIXED", "Moving averages are not in a clean order.")


def rsi_reading(rsi: float) -> Reading:
    if rsi < 30:
        return (
            "MOMENTUM_WEAK_OVERSOLD",
            "RSI is below 30: weak, and possibly an oversold context.",
        )
    if rsi < 45:
        return ("MOMENTUM_WEAK", "RSI is between 30 and 45: weak momentum.")
    if rsi <= 55:
        return ("MOMENTUM_NEUTRAL", "RSI is between 45 and 55: near the midpoint.")
    if rsi <= 70:
        return ("MOMENTUM_POSITIVE", "RSI is between 55 and 70: positive momentum.")
    return (
        "MOMENTUM_EXTENDED",
        "RSI is above 70: strong momentum that may also be extended.",
    )


def adx_reading(adx: float) -> Reading:
    if adx < 20:
        return (
            "ADX_WEAK",
            "ADX is below 20, so there is little evidence of a trend. ADX does not show direction.",
        )
    if adx <= 25:
        return (
            "ADX_DEVELOPING",
            "ADX is between 20 and 25: a trend may be developing. ADX does not show direction.",
        )
    if adx <= 40:
        return (
            "ADX_TRENDING",
            "ADX is above 25: the trend is meaningful. Direction still comes from price.",
        )
    return (
        "ADX_STRONG",
        "ADX is above 40: the trend is very strong. Direction still comes from price.",
    )


def volatility_reading(atr_pct: float) -> Reading:
    if atr_pct < 1.15:
        return (
            "VOL_QUIET",
            "ATR % is in a quiet range. That describes risk, not quality.",
        )
    if atr_pct < 2.05:
        return ("VOL_NORMAL", "ATR % is in a normal range for this universe.")
    if atr_pct < 3.4:
        return (
            "VOL_ELEVATED",
            "ATR % is elevated. A high reading means a wider range, not a better stock.",
        )
    return (
        "VOL_EXTREME",
        "ATR % is extreme versus the display thresholds. Treat it as a risk regime.",
    )


def volume_reading(rvol: float) -> Reading:
    if rvol < 0.75:
        return (
            "PARTICIPATION_LIGHT",
            "Relative volume is below 0.75×, so participation is light.",
        )
    if rvol <= 1.25:
        return ("PARTICIPATION_NORMAL", "Relative volume is between 0.75× and 1.25×.")
    if rvol <= 2:
        return (
            "PARTICIPATION_ACTIVE",
            "Relative volume is between 1.25× and 2×. Direction still comes from price.",
        )
    return (
        "PARTICIPATION_EXCEPTIONAL",
        "Relative volume is above 2×. Activity is unusual; it is not bullish or bearish by itself.",
    )


def return_reading(value: float) -> Reading:
    if value > 0.05:
        return ("RETURN_POSITIVE", "The change is positive.")
    if value < -0.05:
        return ("RETURN_NEGATIVE", "The change is negative.")
    return ("RETURN_FLAT", "The change is roughly flat.")


def drawdown_reading(value: float) -> Reading:
    if value >= -1:
        return ("DRAWDOWN_AT_PEAK", "Price is at or within 1% of its trailing peak.")
    if value >= -8:
        return ("DRAWDOWN_SHALLOW", "The current drawdown is shallow.")
    if value >= -20:
        return (
            "DRAWDOWN_MODERATE",
            "The current drawdown is moderate. Depth is context, not a buy signal.",
        )
    return (
        "DRAWDOWN_DEEP",
        "The current drawdown is deep. That describes weakness, not an automatic opportunity.",
    )


def distance_high_reading(value: float) -> Reading:
    if value >= -2:
        return ("DISTANCE_NEAR_HIGH", "Price is within 2% of the 52-week high.")
    if value >= -12:
        return (
            "DISTANCE_OFF_HIGH",
            "Price has moved off the 52-week high without a deep reset.",
        )
    return ("DISTANCE_PULLED_BACK", "Price is well below the 52-week high.")


def distance_low_reading(value: float) -> Reading:
    if value <= 8:
        return ("DISTANCE_NEAR_LOW", "Price is within 8% of the 52-week low.")
    return ("DISTANCE_ABOVE_LOW", "Price is comfortably above the 52-week low.")


def slope_reading(value: float) -> Reading:
    if value > 0.15:
        return ("SLOPE_RISING", "The average is rising over the last 10 sessions.")
    if value < -0.15:
        return ("SLOPE_FALLING", "The average is falling over the last 10 sessions.")
    return ("SLOPE_FLAT", "The average is nearly flat over the last 10 sessions.")


def histogram_reading(histogram: float, direction: str) -> Reading:
    if histogram > 0.0001:
        return ("HIST_POSITIVE", f"The MACD histogram is positive and {direction}.")
    if histogram < -0.0001:
        return ("HIST_NEGATIVE", f"The MACD histogram is negative and {direction}.")
    return ("HIST_FLAT", "The MACD histogram is near zero.")


def macd_reading(above_signal: bool, above_zero: bool) -> Reading:
    zero = "above zero" if above_zero else "below zero"
    if above_signal:
        return ("MACD_ABOVE_SIGNAL", f"MACD is above its signal and {zero}.")
    return ("MACD_BELOW_SIGNAL", f"MACD is below its signal and {zero}.")


def cmf_reading(value: float) -> Reading:
    if value > 0.05:
        return (
            "CMF_POSITIVE",
            "20-day Chaikin Money Flow is positive. Confirm it with price direction.",
        )
    if value < -0.05:
        return (
            "CMF_NEGATIVE",
            "20-day Chaikin Money Flow is negative. Confirm it with price direction.",
        )
    return ("CMF_NEUTRAL", "20-day Chaikin Money Flow is near zero.")


def breadth_reading(pct: float) -> Reading:
    if pct >= 70:
        return (
            "BREADTH_BROAD",
            "A wide share of the illustrated universe is above this average.",
        )
    if pct >= 45:
        return ("BREADTH_SELECTIVE", "Participation is selective rather than broad.")
    return (
        "BREADTH_NARROW",
        "Only a narrow share of the illustrated universe is above this average.",
    )


def above_average_reading(distance: float) -> Reading:
    if distance >= 0:
        return ("PRICE_ABOVE", "Price is above this moving average.")
    return ("PRICE_BELOW", "Price is below this moving average.")


def vix_reading(level: float) -> Reading:
    if level < 14:
        return (
            "VIX_QUIET",
            "VIX is quiet. Low volatility is a regime, not a guarantee of calm ahead.",
        )
    if level < 20:
        return ("VIX_NORMAL", "VIX is in a normal range.")
    if level < 28:
        return (
            "VIX_ELEVATED",
            "VIX is elevated. Higher implied volatility is a risk context.",
        )
    return (
        "VIX_EXTREME",
        "VIX is extreme. Read it as stress, not as a directional signal.",
    )


def new_high_low_reading(highs: int, lows: int) -> Reading:
    if highs > lows * 1.5:
        return ("NEWHIGH_LEAD", "New 20-day highs outnumber new 20-day lows.")
    if lows > highs * 1.5:
        return ("NEWLOW_LEAD", "New 20-day lows outnumber new 20-day highs.")
    return ("NEW_BALANCED", "New 20-day highs and lows are roughly balanced.")


def structure_window_reading(at_high: bool, at_low: bool) -> Reading:
    if at_high and not at_low:
        return ("STRUCTURE_AT_HIGH", "The latest bar printed the window high.")
    if at_low and not at_high:
        return ("STRUCTURE_AT_LOW", "The latest bar printed the window low.")
    if at_high and at_low:
        return ("STRUCTURE_INSIDE", "The latest bar spans the window high and low.")
    return ("STRUCTURE_INSIDE", "Price is inside the prior window.")


def breakout_reading(kind: str) -> Reading:
    if kind == "confirmed":
        return (
            "BREAKOUT_CONFIRMED",
            "Price is at a 20- or 55-day high and relative volume is at least 1.25×.",
        )
    if kind == "price-only":
        return (
            "BREAKOUT_PRICE_ONLY",
            "Price is at a 20- or 55-day high, but relative volume is not confirming it.",
        )
    return ("BREAKOUT_NONE", "Price is not at a 20- or 55-day high.")


def risk_bucket(value: float, quiet: float, normal: float, elevated: float, noun: str) -> Reading:
    if value < quiet:
        return ("VOL_QUIET", f"{noun} is quiet. Read it as a risk context, not a quality score.")
    if value < normal:
        return ("VOL_NORMAL", f"{noun} is in a normal range.")
    if value < elevated:
        return (
            "VOL_ELEVATED",
            f"{noun} is elevated. A high reading is not a better reading.",
        )
    return ("VOL_EXTREME", f"{noun} is extreme versus the display thresholds.")


def derive_regime(
    spy_above_50: bool,
    spy_above_200: bool,
    qqq_above_200: bool,
    breadth_50: float,
    breadth_200: float,
) -> Dict[str, str]:
    qqq_text = (
        "QQQ is above its 200-day average."
        if qqq_above_200
        else "QQQ is below its 200-day average."
    )
    if not spy_above_200 and breadth_50 < 40:
        return {
            "state": "REGIME_RISK_OFF",
            "label": "Broad risk-off",
            "summary": (
                f"SPY is below its 200-day average and breadth is weak. {qqq_text} "
                "Treat individual strength as selective."
            ),
        }
    if spy_above_200 and spy_above_50 and breadth_50 >= 70 and breadth_200 >= 60:
        return {
            "state": "REGIME_RISK_ON",
            "label": "Risk-on / broad strength",
            "summary": (
                f"SPY is above its 50- and 200-day averages, and participation is broad. {qqq_text}"
            ),
        }
    if spy_above_200 and spy_above_50 and breadth_50 < 65:
        return {
            "state": "REGIME_POSITIVE_NARROWING",
            "label": "Positive but narrowing",
            "summary": (
                f"The index trend is still positive, but participation is not broad. {qqq_text} "
                "Leadership is doing more of the work than the average stock."
            ),
        }
    if spy_above_200 and breadth_50 < 45:
        return {
            "state": "REGIME_DEFENSIVE",
            "label": "Defensive / weakening",
            "summary": (
                f"Longer-term trend support is still intact, but breadth has weakened. {qqq_text}"
            ),
        }
    return {
        "state": "REGIME_MIXED",
        "label": "Mixed / range-bound",
        "summary": f"Index trend and breadth do not agree on one regime. {qqq_text}",
    }


def histogram_direction(current: Optional[float], previous: Optional[float]) -> str:
    if current is None or previous is None:
        return "flat"
    delta = current - previous
    if delta > 1e-6:
        return "rising"
    if delta < -1e-6:
        return "falling"
    return "flat"
