import type { RelativeStrengthState, TrendAlignment } from '@/domain/types';

export interface Reading {
  state: string;
  shortText: string;
}

const RS_TEXT: Record<RelativeStrengthState, string> = {
  LEADING_MARKET_AND_SECTOR: '6-month performance is ahead of both SPY and the sector ETF.',
  LEADING_MARKET: '6-month performance is ahead of SPY and behind or only in line with the sector ETF.',
  LEADING_SECTOR: '6-month performance is ahead of the sector ETF without leading SPY.',
  IN_LINE: '6-month performance is close to both benchmarks.',
  LAGGING: '6-month performance is behind SPY, the sector ETF, or both.',
  INSUFFICIENT: 'A 6-month relative-strength state needs 126 sessions.',
};

function side(value: number): 'up' | 'down' | 'flat' {
  if (value > 0.5) return 'up';
  if (value < -0.5) return 'down';
  return 'flat';
}

export function relativeStrengthReading(
  vsSpy6m: number | null,
  vsSector6m: number | null,
): Reading & { state: RelativeStrengthState } {
  if (vsSpy6m == null || vsSector6m == null) {
    return { state: 'INSUFFICIENT', shortText: RS_TEXT.INSUFFICIENT };
  }
  const spy = side(vsSpy6m);
  const sector = side(vsSector6m);
  let state: RelativeStrengthState = 'IN_LINE';
  if (spy === 'up' && sector === 'up') state = 'LEADING_MARKET_AND_SECTOR';
  else if (spy === 'up' && sector !== 'up') state = 'LEADING_MARKET';
  else if (spy !== 'up' && sector === 'up') state = 'LEADING_SECTOR';
  else if (spy === 'down' || sector === 'down') state = 'LAGGING';
  return { state, shortText: RS_TEXT[state] };
}

export function alignmentReading(
  price: number,
  sma20: number | null,
  sma50: number | null,
  sma200: number | null,
): Reading & { state: TrendAlignment } {
  if (sma20 == null || sma50 == null || sma200 == null) {
    return {
      state: 'INSUFFICIENT',
      shortText: 'Alignment needs a 20-day, 50-day, and 200-day average.',
    };
  }
  if (price > sma20 && sma20 > sma50 && sma50 > sma200) {
    return {
      state: 'STRONG_UPTREND',
      shortText: 'Price > SMA20 > SMA50 > SMA200. The averages are stacked upward.',
    };
  }
  if (price < sma20 && sma20 < sma50 && sma50 < sma200) {
    return {
      state: 'STRONG_DOWNTREND',
      shortText: 'Price < SMA20 < SMA50 < SMA200. The averages are stacked downward.',
    };
  }
  if (price > sma50 && sma50 > sma200) {
    return {
      state: 'UPTREND',
      shortText: 'Price is above the 50- and 200-day averages, with mixed short-term alignment.',
    };
  }
  if (price < sma50 && sma50 < sma200) {
    return {
      state: 'DOWNTREND',
      shortText: 'Price is below the 50- and 200-day averages.',
    };
  }
  return {
    state: 'MIXED',
    shortText: 'Moving averages are not in a clean order.',
  };
}

export function rsiReading(rsi: number): Reading {
  if (rsi < 30) {
    return { state: 'MOMENTUM_WEAK_OVERSOLD', shortText: 'RSI is below 30: weak, and possibly an oversold context.' };
  }
  if (rsi < 45) {
    return { state: 'MOMENTUM_WEAK', shortText: 'RSI is between 30 and 45: weak momentum.' };
  }
  if (rsi <= 55) {
    return { state: 'MOMENTUM_NEUTRAL', shortText: 'RSI is between 45 and 55: near the midpoint.' };
  }
  if (rsi <= 70) {
    return { state: 'MOMENTUM_POSITIVE', shortText: 'RSI is between 55 and 70: positive momentum.' };
  }
  return {
    state: 'MOMENTUM_EXTENDED',
    shortText: 'RSI is above 70: strong momentum that may also be extended.',
  };
}

export function adxReading(adx: number): Reading {
  if (adx < 20) {
    return { state: 'ADX_WEAK', shortText: 'ADX is below 20, so there is little evidence of a trend. ADX does not show direction.' };
  }
  if (adx <= 25) {
    return { state: 'ADX_DEVELOPING', shortText: 'ADX is between 20 and 25: a trend may be developing. ADX does not show direction.' };
  }
  if (adx <= 40) {
    return { state: 'ADX_TRENDING', shortText: 'ADX is above 25: the trend is meaningful. Direction still comes from price.' };
  }
  return { state: 'ADX_STRONG', shortText: 'ADX is above 40: the trend is very strong. Direction still comes from price.' };
}

/** Display thresholds for ATR %. The vocabulary is Quiet / Normal / Elevated / Extreme. */
export function volatilityReading(atrPct: number): Reading {
  if (atrPct < 1.15) {
    return { state: 'VOL_QUIET', shortText: 'ATR % is in a quiet range. That describes risk, not quality.' };
  }
  if (atrPct < 2.05) {
    return { state: 'VOL_NORMAL', shortText: 'ATR % is in a normal range for this demo universe.' };
  }
  if (atrPct < 3.4) {
    return { state: 'VOL_ELEVATED', shortText: 'ATR % is elevated. A high reading means a wider range, not a better stock.' };
  }
  return { state: 'VOL_EXTREME', shortText: 'ATR % is extreme versus the display thresholds. Treat it as a risk regime.' };
}

export function volumeReading(rvol: number): Reading {
  if (rvol < 0.75) {
    return { state: 'PARTICIPATION_LIGHT', shortText: 'Relative volume is below 0.75×, so participation is light.' };
  }
  if (rvol <= 1.25) {
    return { state: 'PARTICIPATION_NORMAL', shortText: 'Relative volume is between 0.75× and 1.25×.' };
  }
  if (rvol <= 2) {
    return { state: 'PARTICIPATION_ACTIVE', shortText: 'Relative volume is between 1.25× and 2×. Direction still comes from price.' };
  }
  return {
    state: 'PARTICIPATION_EXCEPTIONAL',
    shortText: 'Relative volume is above 2×. Activity is unusual; it is not bullish or bearish by itself.',
  };
}

export function returnReading(value: number): Reading {
  if (value > 0.05) return { state: 'RETURN_POSITIVE', shortText: 'The change is positive.' };
  if (value < -0.05) return { state: 'RETURN_NEGATIVE', shortText: 'The change is negative.' };
  return { state: 'RETURN_FLAT', shortText: 'The change is roughly flat.' };
}

export function drawdownReading(value: number): Reading {
  if (value >= -1) return { state: 'DRAWDOWN_AT_PEAK', shortText: 'Price is at or within 1% of its trailing peak.' };
  if (value >= -8) return { state: 'DRAWDOWN_SHALLOW', shortText: 'The current drawdown is shallow.' };
  if (value >= -20) return { state: 'DRAWDOWN_MODERATE', shortText: 'The current drawdown is moderate. Depth is context, not a buy signal.' };
  return { state: 'DRAWDOWN_DEEP', shortText: 'The current drawdown is deep. That describes weakness, not an automatic opportunity.' };
}

export function distanceHighReading(value: number): Reading {
  if (value >= -2) return { state: 'DISTANCE_NEAR_HIGH', shortText: 'Price is within 2% of the 52-week high.' };
  if (value >= -12) return { state: 'DISTANCE_OFF_HIGH', shortText: 'Price has moved off the 52-week high without a deep reset.' };
  return { state: 'DISTANCE_PULLED_BACK', shortText: 'Price is well below the 52-week high.' };
}

export function distanceLowReading(value: number): Reading {
  if (value <= 8) return { state: 'DISTANCE_NEAR_LOW', shortText: 'Price is within 8% of the 52-week low.' };
  return { state: 'DISTANCE_ABOVE_LOW', shortText: 'Price is comfortably above the 52-week low.' };
}

export function slopeReading(value: number): Reading {
  if (value > 0.15) return { state: 'SLOPE_RISING', shortText: 'The average is rising over the last 10 sessions.' };
  if (value < -0.15) return { state: 'SLOPE_FALLING', shortText: 'The average is falling over the last 10 sessions.' };
  return { state: 'SLOPE_FLAT', shortText: 'The average is nearly flat over the last 10 sessions.' };
}

export function histogramReading(histogram: number, direction: 'rising' | 'falling' | 'flat'): Reading {
  const directionText = direction === 'rising' ? 'rising' : direction === 'falling' ? 'falling' : 'flat';
  if (histogram > 0.0001) {
    return { state: 'HIST_POSITIVE', shortText: `The MACD histogram is positive and ${directionText}.` };
  }
  if (histogram < -0.0001) {
    return { state: 'HIST_NEGATIVE', shortText: `The MACD histogram is negative and ${directionText}.` };
  }
  return { state: 'HIST_FLAT', shortText: 'The MACD histogram is near zero.' };
}

export function macdReading(aboveSignal: boolean, aboveZero: boolean): Reading {
  const zero = aboveZero ? 'above zero' : 'below zero';
  if (aboveSignal) {
    return { state: 'MACD_ABOVE_SIGNAL', shortText: `MACD is above its signal and ${zero}.` };
  }
  return { state: 'MACD_BELOW_SIGNAL', shortText: `MACD is below its signal and ${zero}.` };
}

export function cmfReading(value: number): Reading {
  if (value > 0.05) return { state: 'CMF_POSITIVE', shortText: '20-day Chaikin Money Flow is positive. Confirm it with price direction.' };
  if (value < -0.05) return { state: 'CMF_NEGATIVE', shortText: '20-day Chaikin Money Flow is negative. Confirm it with price direction.' };
  return { state: 'CMF_NEUTRAL', shortText: '20-day Chaikin Money Flow is near zero.' };
}

export function breadthReading(pct: number): Reading {
  if (pct >= 70) return { state: 'BREADTH_BROAD', shortText: 'A wide share of the illustrated universe is above this average.' };
  if (pct >= 45) return { state: 'BREADTH_SELECTIVE', shortText: 'Participation is selective rather than broad.' };
  return { state: 'BREADTH_NARROW', shortText: 'Only a narrow share of the illustrated universe is above this average.' };
}

export function aboveAverageReading(distance: number): Reading {
  if (distance >= 0) return { state: 'PRICE_ABOVE', shortText: 'Price is above this moving average.' };
  return { state: 'PRICE_BELOW', shortText: 'Price is below this moving average.' };
}

export function vixReading(level: number): Reading {
  if (level < 14) return { state: 'VIX_QUIET', shortText: 'VIX is quiet. Low volatility is a regime, not a guarantee of calm ahead.' };
  if (level < 20) return { state: 'VIX_NORMAL', shortText: 'VIX is in a normal range for this fixture.' };
  if (level < 28) return { state: 'VIX_ELEVATED', shortText: 'VIX is elevated. Higher implied volatility is a risk context.' };
  return { state: 'VIX_EXTREME', shortText: 'VIX is extreme. Read it as stress, not as a directional signal.' };
}

export function newHighLowReading(highs: number, lows: number): Reading {
  if (highs > lows * 1.5) {
    return { state: 'NEWHIGH_LEAD', shortText: 'New 20-day highs outnumber new 20-day lows.' };
  }
  if (lows > highs * 1.5) {
    return { state: 'NEWLOW_LEAD', shortText: 'New 20-day lows outnumber new 20-day highs.' };
  }
  return { state: 'NEW_BALANCED', shortText: 'New 20-day highs and lows are roughly balanced.' };
}

export function structureWindowReading(atHigh: boolean, atLow: boolean): Reading {
  if (atHigh && !atLow) return { state: 'STRUCTURE_AT_HIGH', shortText: 'The latest bar printed the window high.' };
  if (atLow && !atHigh) return { state: 'STRUCTURE_AT_LOW', shortText: 'The latest bar printed the window low.' };
  if (atHigh && atLow) return { state: 'STRUCTURE_INSIDE', shortText: 'The latest bar spans the window high and low.' };
  return { state: 'STRUCTURE_INSIDE', shortText: 'Price is inside the prior window.' };
}

export function breakoutReading(kind: 'confirmed' | 'price-only' | 'none'): Reading {
  if (kind === 'confirmed') {
    return { state: 'BREAKOUT_CONFIRMED', shortText: 'Price is at a 20- or 55-day high and relative volume is at least 1.25×.' };
  }
  if (kind === 'price-only') {
    return { state: 'BREAKOUT_PRICE_ONLY', shortText: 'Price is at a 20- or 55-day high, but relative volume is not confirming it.' };
  }
  return { state: 'BREAKOUT_NONE', shortText: 'Price is not at a 20- or 55-day high.' };
}
