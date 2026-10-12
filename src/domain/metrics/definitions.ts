import type {
  ComparisonPolicy,
  InterpretationMode,
  MetricDefinition,
  MetricHelp,
} from '@/domain/types';

const PERCENTILE_CAVEAT =
  'A high percentile means the reading is high versus that comparison group. It is not a quality score and it is not a buy or sell signal.';

interface DefineInput {
  id: string;
  label: string;
  dimension: string;
  unit?: string;
  comparisonPolicy: ComparisonPolicy;
  interpretationMode: InterpretationMode;
  precision: number;
  help: Omit<MetricHelp, 'metricId' | 'title'> & { title?: string };
}

function define(input: DefineInput): MetricDefinition {
  return {
    id: input.id,
    label: input.label,
    dimension: input.dimension,
    unit: input.unit,
    comparisonPolicy: input.comparisonPolicy,
    interpretationMode: input.interpretationMode,
    precision: input.precision,
    help: {
      metricId: input.id,
      title: input.help.title ?? input.label,
      plainEnglish: input.help.plainEnglish,
      formula: input.help.formula,
      howToRead: input.help.howToRead,
      compareAgainst: input.help.compareAgainst,
      caveats: input.help.caveats,
      example: input.help.example,
    },
  };
}

const definitions: Record<string, MetricDefinition> = {};

function add(input: DefineInput) {
  definitions[input.id] = define(input);
}

const RETURN_HORIZONS: Array<[string, string, string]> = [
  ['return.1d', '1D return', '1 trading day'],
  ['return.5d', '5D return', '5 trading days'],
  ['return.1m', '1M return', 'about 21 trading days'],
  ['return.3m', '3M return', 'about 63 trading days'],
  ['return.6m', '6M return', 'about 126 trading days'],
  ['return.ytd', 'YTD return', 'the move since the last session of the prior year'],
  ['return.1y', '1Y return', 'about 252 trading days'],
];

for (const [id, label, horizon] of RETURN_HORIZONS) {
  add({
    id,
    label,
    dimension: 'Price Performance',
    unit: '%',
    comparisonPolicy: 'MARKET',
    interpretationMode: 'HIGHER_IS_STRONGER',
    precision: 1,
    help: {
      plainEnglish: `${label} is the percentage price change over ${horizon}.`,
      formula: 'Return = close today / close at the horizon − 1.',
      howToRead: [
        'A positive number means the price is higher than it was at the start of the window.',
        'The sign is the directional reading. The percentile says whether that return is unusual.',
      ],
      compareAgainst: [
        'The same horizon for SPY and the sector ETF.',
        'The stock’s own history and same-date large/mega-cap peers.',
      ],
      caveats: [
        PERCENTILE_CAVEAT,
        'A strong past return does not predict the next return.',
        'Use adjusted prices in the future pipeline so splits do not create false moves.',
      ],
      example: 'A +12% six-month return that is only the 40th percentile may be ordinary for that stock.',
    },
  });
}

add({
  id: 'distance.52w-high',
  label: 'Distance from 52W high',
  dimension: 'Price Performance',
  unit: '%',
  comparisonPolicy: 'SECTOR_SIZE',
  interpretationMode: 'TWO_SIDED_RISK',
  precision: 1,
  help: {
    plainEnglish: 'How far the latest close sits below the highest price of the last 52 weeks.',
    formula: 'Distance = close / 52-week high − 1. Zero means the close is at the high.',
    howToRead: [
      'Values near zero mean the stock is pressing the 52-week high.',
      'A large negative number means a substantial retreat from that high.',
      'Near a high can be strength or an extended condition. The state label stays descriptive.',
    ],
    compareAgainst: ['Distance from the 52-week low.', 'Whether the move came with unusual volume.'],
    caveats: [PERCENTILE_CAVEAT, 'A short history cannot build a true 52-week window.'],
  },
});

add({
  id: 'distance.52w-low',
  label: 'Distance from 52W low',
  dimension: 'Price Performance',
  unit: '%',
  comparisonPolicy: 'SECTOR_SIZE',
  interpretationMode: 'TWO_SIDED_RISK',
  precision: 1,
  help: {
    plainEnglish: 'How far the latest close sits above the lowest price of the last 52 weeks.',
    formula: 'Distance = close / 52-week low − 1.',
    howToRead: [
      'A small positive number means price is still near the 52-week low.',
      'A large positive number only says the low is far behind the current price.',
    ],
    compareAgainst: ['Distance from the 52-week high and the current drawdown.'],
    caveats: [PERCENTILE_CAVEAT, 'Being far above the low is not a recommendation to buy.'],
  },
});

add({
  id: 'trend.alignment',
  label: 'Moving-average alignment',
  dimension: 'Trend',
  comparisonPolicy: 'NONE',
  interpretationMode: 'CATEGORICAL',
  precision: 0,
  help: {
    plainEnglish: 'The order of price and the 20-, 50-, and 200-day simple moving averages.',
    howToRead: [
      'Price > SMA20 > SMA50 > SMA200 is a clean upward stack.',
      'The inverse is a clean downward stack.',
      'Price above the 50- and 200-day averages with a messy 20-day average is an uptrend with mixed short-term alignment.',
      'Any other order is mixed.',
    ],
    compareAgainst: ['Distance from each average and whether those averages are rising or falling.'],
    caveats: [
      'Moving averages lag price and can whipsaw in sideways markets.',
      'These states are descriptions. They are not buy or sell labels.',
    ],
    example: 'A clean upward stack can still be stretched if price is far above the 20-day average.',
  },
});

for (const [id, label, period] of [
  ['trend.sma20', 'SMA 20', '20'],
  ['trend.sma50', 'SMA 50', '50'],
  ['trend.sma200', 'SMA 200', '200'],
] as const) {
  add({
    id,
    label,
    dimension: 'Trend',
    unit: 'USD',
    comparisonPolicy: 'NONE',
    interpretationMode: 'CATEGORICAL',
    precision: 2,
    help: {
      plainEnglish: `The ${period}-day simple moving average is the mean closing price over the last ${period} sessions.`,
      formula: `SMA ${period} = sum of the last ${period} closes / ${period}.`,
      howToRead: [
        'Price above the average means buyers have kept the close on that side of the mean.',
        'The slope says whether the average itself is rising or falling.',
      ],
      compareAgainst: ['The other moving averages in the trend stack.', 'Distance from this average, in percent.'],
      caveats: ['Averages lag turns.', 'Do not compare the dollar level across stocks; use percent distance.'],
    },
  });
}

for (const [id, label, period] of [
  ['trend.dist-sma20', 'Distance from SMA 20', '20'],
  ['trend.dist-sma50', 'Distance from SMA 50', '50'],
  ['trend.dist-sma200', 'Distance from SMA 200', '200'],
] as const) {
  add({
    id,
    label,
    dimension: 'Trend',
    unit: '%',
    comparisonPolicy: 'SECTOR_SIZE',
    interpretationMode: 'TWO_SIDED_RISK',
    precision: 1,
    help: {
      plainEnglish: `How far the latest close is from its ${period}-day average, in percent.`,
      formula: `Distance = close / SMA ${period} − 1.`,
      howToRead: [
        'A positive distance means price is above the average.',
        'A very large positive distance can mean a strong trend or a stretched move.',
      ],
      compareAgainst: [`The stock’s own history of distance from the ${period}-day average.`, 'Same-date peers.'],
      caveats: [PERCENTILE_CAVEAT, 'Distance does not say whether the average is rising.'],
    },
  });
}

for (const [id, label, period] of [
  ['trend.slope-sma20', 'SMA 20 slope', '20'],
  ['trend.slope-sma50', 'SMA 50 slope', '50'],
  ['trend.slope-sma200', 'SMA 200 slope', '200'],
] as const) {
  add({
    id,
    label,
    dimension: 'Trend',
    unit: '%',
    comparisonPolicy: 'SECTOR_SIZE',
    interpretationMode: 'HIGHER_IS_STRONGER',
    precision: 2,
    help: {
      plainEnglish: `The percent change in the ${period}-day average over the last 10 sessions.`,
      formula: 'Slope = SMA today / SMA 10 sessions ago − 1.',
      howToRead: [
        'A rising average supports the trend in that direction.',
        'A flat long average often means a range, even if price is bouncing.',
      ],
      compareAgainst: ['Alignment and the distance from the same average.'],
      caveats: [PERCENTILE_CAVEAT, 'Slope is slow by design, especially for the 200-day average.'],
    },
  });
}

add({
  id: 'trend.adx',
  label: 'ADX 14',
  dimension: 'Trend',
  comparisonPolicy: 'SECTOR_SIZE',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 1,
  help: {
    plainEnglish: 'Average Directional Index measures how directional the recent trend is, not which way it points.',
    formula: 'Wilder ADX 14. In this demo the level is a stable fixture; the live pipeline should use FinanceToolkit.',
    howToRead: [
      'Below 20: weak or little trend.',
      '20 to 25: a trend may be developing.',
      'Above 25: a meaningful trend.',
      'Above 40: a very strong trend.',
    ],
    compareAgainst: ['Moving-average alignment for direction.', 'The stock’s own ADX history.'],
    caveats: ['ADX does not indicate direction.', PERCENTILE_CAVEAT],
    example: 'ADX 41 with price under every major average is a strong downtrend, not a strong buy.',
  },
});

add({
  id: 'momentum.rsi14',
  label: 'RSI 14',
  dimension: 'Momentum',
  comparisonPolicy: 'SECTOR_SIZE',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 1,
  help: {
    plainEnglish: 'RSI compares the size of recent gains with recent losses on a 0 to 100 scale.',
    formula: 'Wilder RSI 14. This demo uses a fixture reading so high and low examples stay stable.',
    howToRead: [
      'Below 30: weak / oversold context.',
      '30 to 45: weak momentum.',
      '45 to 55: neutral.',
      '55 to 70: positive momentum.',
      'Above 70: strong momentum that may be extended.',
    ],
    compareAgainst: [
      'The stock’s own RSI percentile, which can differ from the textbook 70/30 bands.',
      'Same-date sector and market peers.',
    ],
    caveats: [
      'A high RSI is not automatically good, and a low RSI is not automatically an opportunity.',
      'RSI can stay high for a long time in a strong trend.',
      PERCENTILE_CAVEAT,
    ],
    example: 'RSI 74 at the 93rd percentile means the reading is unusually high for this stock, not that it should be sold or bought.',
  },
});

add({
  id: 'momentum.macd',
  label: 'MACD',
  dimension: 'Momentum',
  comparisonPolicy: 'NONE',
  interpretationMode: 'CATEGORICAL',
  precision: 2,
  help: {
    plainEnglish: 'MACD is the difference between the 12-day and 26-day exponential moving averages of price.',
    formula: 'MACD = EMA 12 − EMA 26. Signal = EMA 9 of MACD. Histogram = MACD − signal.',
    howToRead: [
      'Above the signal means the shorter trend is ahead of the signal line.',
      'Above zero means the 12-day average is above the 26-day average.',
    ],
    compareAgainst: ['The signal line, the zero line, and the histogram direction.'],
    caveats: ['MACD lags because it is built from moving averages.', 'Do not treat a positive MACD as a buy signal.'],
  },
});

add({
  id: 'momentum.macd-signal',
  label: 'MACD signal',
  dimension: 'Momentum',
  comparisonPolicy: 'NONE',
  interpretationMode: 'CATEGORICAL',
  precision: 2,
  help: {
    plainEnglish: 'The 9-period exponential average of the MACD line. It is the slower reference for the MACD cross.',
    formula: 'Signal = EMA 9 of the MACD line.',
    howToRead: ['Read it together with the MACD line. The gap between them is the histogram.'],
    compareAgainst: ['MACD line and histogram.'],
    caveats: ['The signal line lags the MACD line by construction.'],
  },
});

add({
  id: 'momentum.macd-histogram',
  label: 'MACD histogram',
  dimension: 'Momentum',
  comparisonPolicy: 'SECTOR_SIZE',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 2,
  help: {
    plainEnglish: 'The gap between the MACD line and its signal. It shows whether that gap is growing or shrinking.',
    formula: 'Histogram = MACD − signal.',
    howToRead: [
      'Positive means MACD is above the signal.',
      'Rising means the gap is widening in favor of the shorter average, or narrowing a negative gap.',
    ],
    compareAgainst: ['RSI, so you can see when momentum tools disagree.', 'The stock’s own histogram history.'],
    caveats: [PERCENTILE_CAVEAT, 'Histogram turns often arrive late.'],
  },
});

for (const [id, label, days] of [
  ['momentum.roc20', 'ROC 20D', '20'],
  ['momentum.roc63', 'ROC 63D', '63'],
] as const) {
  add({
    id,
    label,
    dimension: 'Momentum',
    unit: '%',
    comparisonPolicy: 'SECTOR_SIZE',
    interpretationMode: 'HIGHER_IS_STRONGER',
    precision: 1,
    help: {
      plainEnglish: `Rate of change over ${days} trading days. It is the raw percent move, kept with the oscillators so momentum is not only RSI.`,
      formula: `ROC = close / close ${days} sessions ago − 1.`,
      howToRead: ['Positive ROC means the price is higher than it was at the start of the window.'],
      compareAgainst: ['RSI and MACD for the same stock.', 'Peer ROC on the same date.'],
      caveats: [PERCENTILE_CAVEAT, 'ROC has no memory of the path inside the window.'],
    },
  });
}

const RS_HORIZONS: Array<[string, string, string, string]> = [
  ['rs.spy.1m', '1M vs SPY', '1-month', 'SPY'],
  ['rs.spy.3m', '3M vs SPY', '3-month', 'SPY'],
  ['rs.spy.6m', '6M vs SPY', '6-month', 'SPY'],
  ['rs.spy.12m', '12M vs SPY', '12-month', 'SPY'],
  ['rs.sector.1m', '1M vs sector', '1-month', 'the sector ETF'],
  ['rs.sector.3m', '3M vs sector', '3-month', 'the sector ETF'],
  ['rs.sector.6m', '6M vs sector', '6-month', 'the sector ETF'],
  ['rs.sector.12m', '12M vs sector', '12-month', 'the sector ETF'],
];

for (const [id, label, horizon, benchmark] of RS_HORIZONS) {
  add({
    id,
    label,
    dimension: 'Relative Strength',
    unit: 'pp',
    comparisonPolicy: 'BENCHMARK_RELATIVE',
    interpretationMode: 'HIGHER_IS_STRONGER',
    precision: 1,
    help: {
      plainEnglish: `The stock’s ${horizon} return minus the ${benchmark} return, in percentage points.`,
      formula: 'Excess return = stock return − benchmark return, for the same window.',
      howToRead: [
        'Positive means the stock outperformed that benchmark.',
        'A stock can lead SPY and lag its sector at the same time. Read both rows.',
      ],
      compareAgainst: ['The other horizons in the matrix.', 'The derived relative-strength state, which uses the 6-month pair.'],
      caveats: [
        PERCENTILE_CAVEAT,
        'This is a simple difference of returns, not a beta-adjusted residual.',
      ],
      example: 'Up 8 points versus SPY and down 4 points versus the sector ETF is leading the market, not the sector.',
    },
  });
}

add({
  id: 'rs.state',
  label: 'Relative-strength state',
  dimension: 'Relative Strength',
  comparisonPolicy: 'BENCHMARK_RELATIVE',
  interpretationMode: 'CATEGORICAL',
  precision: 0,
  help: {
    plainEnglish: 'A label for how the 6-month excess return compares with SPY and the sector ETF.',
    howToRead: [
      'Leading market and sector: ahead of both by more than half a percentage point.',
      'Leading market: ahead of SPY, not ahead of the sector.',
      'Leading sector: ahead of the sector, not ahead of SPY.',
      'Lagging: behind at least one benchmark while the other is not a clear lead.',
      'In line: both gaps are inside half a percentage point.',
    ],
    compareAgainst: ['The full 1M / 3M / 6M / 12M matrix. The state uses 6 months only.'],
    caveats: ['The state is descriptive. It is not a leaderboard prize or a buy rating.'],
  },
});

add({
  id: 'vol.atr-pct',
  label: 'ATR %',
  dimension: 'Volatility & Risk',
  unit: '%',
  comparisonPolicy: 'SECTOR_SIZE',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 1,
  help: {
    plainEnglish: 'Average true range over 14 sessions, divided by price. It is the preferred volatility comparison across stocks.',
    formula: 'ATR % = ATR 14 / close × 100.',
    howToRead: [
      'Quiet, normal, elevated, and extreme describe the range. They do not mean good or bad.',
      'A high percentile means the range is wide versus the chosen cohort.',
    ],
    compareAgainst: ['The stock’s own 2-year ATR % history.', 'Sector and market peers on the same date.', '20-day and 60-day realized volatility.'],
    caveats: [PERCENTILE_CAVEAT, 'Dollar ATR is not used for cross-stock comparison because price levels differ.'],
    example: 'ATR % at the 91st percentile is an elevated-risk context even when the trend is strong.',
  },
});

for (const [id, label, days] of [
  ['vol.realized-20d', 'Realized volatility 20D', '20'],
  ['vol.realized-60d', 'Realized volatility 60D', '60'],
] as const) {
  add({
    id,
    label,
    dimension: 'Volatility & Risk',
    unit: '%',
    comparisonPolicy: 'SECTOR_SIZE',
    interpretationMode: 'EXTREME_CONTEXT',
    precision: 1,
    help: {
      plainEnglish: `Annualized standard deviation of daily log returns over ${days} sessions.`,
      formula: `Stdev of the last ${days} log returns × square root of 252.`,
      howToRead: ['Higher realized volatility means wider day-to-day movement. It is a risk reading.'],
      compareAgainst: ['The other realized-volatility window and ATR %.'],
      caveats: [PERCENTILE_CAVEAT, 'Annualizing a short window can exaggerate a handful of large days.'],
    },
  });
}

add({
  id: 'vol.bb-width',
  label: 'Bollinger width',
  dimension: 'Volatility & Risk',
  unit: '%',
  comparisonPolicy: 'SECTOR_SIZE',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 1,
  help: {
    plainEnglish: 'The width of the 20-day, 2-standard-deviation Bollinger Bands, expressed as a percent of the 20-day average.',
    formula: 'Width = 4 × standard deviation / SMA 20.',
    howToRead: ['A narrow band means recent closes are compressed. A wide band means they are dispersed.'],
    compareAgainst: ['ATR % and realized volatility. Width is another view of the same regime, not a separate trade.'],
    caveats: [PERCENTILE_CAVEAT, 'Compression does not say which way the next move will go.'],
  },
});

add({
  id: 'vol.drawdown',
  label: 'Current drawdown',
  dimension: 'Volatility & Risk',
  unit: '%',
  comparisonPolicy: 'SECTOR_SIZE',
  interpretationMode: 'TWO_SIDED_RISK',
  precision: 1,
  help: {
    plainEnglish: 'How far the latest close is below the highest close in the available history.',
    formula: 'Drawdown = close / trailing peak close − 1.',
    howToRead: [
      'Zero, or nearly zero, means the close is at the peak.',
      'A deep negative number is weakness. It is not automatically an opportunity.',
    ],
    compareAgainst: ['The 1-year maximum drawdown.', 'Distance from the 52-week high.'],
    caveats: [PERCENTILE_CAVEAT, 'The sign and the size both matter. Do not rank drawdowns as if a larger drop were better.'],
  },
});

add({
  id: 'vol.max-drawdown-1y',
  label: '1Y maximum drawdown',
  dimension: 'Volatility & Risk',
  unit: '%',
  comparisonPolicy: 'SECTOR_SIZE',
  interpretationMode: 'TWO_SIDED_RISK',
  precision: 1,
  help: {
    plainEnglish: 'The worst peak-to-trough decline in closing prices over the last year.',
    formula: 'Minimum of close / running peak − 1 across the last 252 sessions.',
    howToRead: ['This is the pain already experienced inside the window, not a forecast.'],
    compareAgainst: ['Current drawdown. A shallow current drawdown after a deep maximum means the stock has recovered.'],
    caveats: [PERCENTILE_CAVEAT, 'A mild maximum drawdown can reflect a quiet stock or a short sample.'],
  },
});

add({
  id: 'volume.daily',
  label: 'Daily volume',
  dimension: 'Volume & Participation',
  unit: 'shares',
  comparisonPolicy: 'NONE',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 0,
  help: {
    plainEnglish: 'Shares traded on the latest session in this snapshot.',
    howToRead: ['Read it next to the 20-day average. The raw share count is hard to compare across stocks.'],
    compareAgainst: ['20-day average volume and relative volume.'],
    caveats: ['Share volume ignores price. Dollar volume is the better cross-stock participation measure.'],
  },
});

add({
  id: 'volume.avg-20d',
  label: '20D average volume',
  dimension: 'Volume & Participation',
  unit: 'shares',
  comparisonPolicy: 'NONE',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 0,
  help: {
    plainEnglish: 'The typical share volume over the last 20 sessions, used as the baseline for relative volume.',
    formula: 'Average of the last 20 daily volumes.',
    howToRead: ['Use it as the denominator for relative volume, not as a standalone quality score.'],
    compareAgainst: ['Latest daily volume.'],
    caveats: ['A 20-day window can be distorted by one unusual session.'],
  },
});

add({
  id: 'volume.rvol',
  label: 'Relative volume',
  dimension: 'Volume & Participation',
  unit: '×',
  comparisonPolicy: 'SECTOR_SIZE',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 2,
  help: {
    plainEnglish: 'Latest share volume divided by the 20-day average volume.',
    formula: 'RVOL = volume today / 20-day average volume.',
    howToRead: [
      'Below 0.75×: light participation.',
      '0.75× to 1.25×: normal.',
      '1.25× to 2×: active.',
      'Above 2×: exceptional activity.',
    ],
    compareAgainst: ['The day’s price direction. Heavy volume on a down day is not the same event as heavy volume on an up day.'],
    caveats: [
      'RVOL 2.3× means activity is unusual. It does not say whether that participation is bullish or bearish.',
      PERCENTILE_CAVEAT,
    ],
  },
});

add({
  id: 'volume.dollar-avg-20d',
  label: '20D average dollar volume',
  dimension: 'Volume & Participation',
  unit: 'USD',
  comparisonPolicy: 'MARKET',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 0,
  help: {
    plainEnglish: 'Typical traded value over 20 sessions. It is the participation measure that can be compared across prices.',
    formula: '20-day average volume × latest close.',
    howToRead: ['Higher dollar volume means more capital turns over. It is not a verdict on the company.'],
    compareAgainst: ['Market-cap tier. A mega cap should normally trade more dollars than a smaller large cap.'],
    caveats: [PERCENTILE_CAVEAT, 'This demo approximates dollar volume with the latest close rather than each day’s close.'],
  },
});

add({
  id: 'volume.cmf-20d',
  label: 'CMF 20D',
  dimension: 'Volume & Participation',
  comparisonPolicy: 'SECTOR_SIZE',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 2,
  help: {
    plainEnglish: 'Chaikin Money Flow over 20 sessions summarizes whether closes landed near the high or the low, weighted by volume.',
    formula: 'CMF 20. In this demo the value is a fixture. A missing value stays missing.',
    howToRead: [
      'Positive flow means closes have tended to finish in the upper part of the daily range on heavier volume.',
      'Negative flow means the opposite. Neither one is a trade instruction.',
    ],
    compareAgainst: ['Relative volume and the day’s price direction.'],
    caveats: [PERCENTILE_CAVEAT, 'Do not fill a missing CMF with zero.'],
  },
});

add({
  id: 'structure.20d',
  label: '20-day high / low',
  dimension: 'Price Structure',
  comparisonPolicy: 'NONE',
  interpretationMode: 'CATEGORICAL',
  precision: 0,
  help: {
    plainEnglish: 'Whether the latest bar printed the highest high or lowest low of the last 20 sessions.',
    howToRead: ['At the high, at the low, or inside the range. Pair it with relative volume before calling it a breakout.'],
    compareAgainst: ['The 55-day window and relative volume.'],
    caveats: ['A 20-day high without unusual volume is only a new high.'],
  },
});

add({
  id: 'structure.55d',
  label: '55-day high / low',
  dimension: 'Price Structure',
  comparisonPolicy: 'NONE',
  interpretationMode: 'CATEGORICAL',
  precision: 0,
  help: {
    plainEnglish: 'Whether the latest bar printed the highest high or lowest low of the last 55 sessions.',
    howToRead: ['Use the longer window to see whether a 20-day high is also a broader breakout.'],
    compareAgainst: ['The 20-day state and the breakout flag.'],
    caveats: ['Pattern labels beyond this high/low status are deferred.'],
  },
});

add({
  id: 'structure.breakout',
  label: 'Breakout and volume',
  dimension: 'Price Structure',
  comparisonPolicy: 'NONE',
  interpretationMode: 'CATEGORICAL',
  precision: 0,
  help: {
    plainEnglish: 'A breakout flag is on only when price is at a 20- or 55-day high and relative volume is at least 1.25×.',
    howToRead: [
      'Breakout with volume: new high and active volume.',
      'New high, ordinary volume: price broke out but participation did not confirm it.',
      'No breakout: price is not at the window high.',
    ],
    compareAgainst: ['Relative volume and the 20- and 55-day states.'],
    caveats: ['This is not a pattern-recognition system. Fibonacci, pivots, and similar tools are deferred.'],
  },
});

add({
  id: 'market.regime',
  label: 'Market regime',
  dimension: 'Market Context',
  comparisonPolicy: 'NONE',
  interpretationMode: 'CATEGORICAL',
  precision: 0,
  help: {
    plainEnglish: 'A daily label for how SPY’s trend and universe breadth fit together.',
    howToRead: [
      'Risk-on / broad strength: SPY is above the 50- and 200-day averages and breadth is wide.',
      'Positive but narrowing: the index trend is up, but fewer stocks are participating.',
      'Mixed / range-bound: trend and breadth disagree.',
      'Defensive / weakening or broad risk-off: participation and trend are both soft.',
    ],
    compareAgainst: ['SPY versus its averages, QQQ versus the 200-day, and the breadth percentages.'],
    caveats: ['The label describes the snapshot. It is not a forecast.'],
  },
});

for (const [id, label, symbol, average] of [
  ['market.spy-vs-50dma', 'SPY vs 50DMA', 'SPY', '50-day'],
  ['market.spy-vs-200dma', 'SPY vs 200DMA', 'SPY', '200-day'],
  ['market.qqq-vs-200dma', 'QQQ vs 200DMA', 'QQQ', '200-day'],
] as const) {
  add({
    id,
    label,
    dimension: 'Market Context',
    unit: '%',
    comparisonPolicy: 'NONE',
    interpretationMode: 'CATEGORICAL',
    precision: 1,
    help: {
      plainEnglish: `How far ${symbol} is from its ${average} average.`,
      formula: 'Distance = close / moving average − 1.',
      howToRead: ['Above means the index close is higher than the average. Below means it is not.'],
      compareAgainst: ['Breadth. An index can be above its average while most stocks are not.'],
      caveats: ['Index distance is context for individual stocks. It is not a timing system.'],
    },
  });
}

for (const [id, label, average] of [
  ['market.breadth-50dma', 'Universe above 50DMA', '50-day'],
  ['market.breadth-200dma', 'Universe above 200DMA', '200-day'],
] as const) {
  add({
    id,
    label,
    dimension: 'Market Context',
    unit: '%',
    comparisonPolicy: 'NONE',
    interpretationMode: 'EXTREME_CONTEXT',
    precision: 0,
    help: {
      plainEnglish: `The share of illustrated names with a close above the ${average} average.`,
      howToRead: [
        'Broad means participation is wide.',
        'Selective means the average stock is not confirming every index move.',
        'Narrow means few names are above the average.',
      ],
      compareAgainst: ['The index versus the same average. Read them as a pair.'],
      caveats: [
        'In this demo, breadth uses the illustrated universe, excluding stale prices and names without that average.',
        'A high percentage is not a buy signal.',
      ],
    },
  });
}

add({
  id: 'market.vix',
  label: 'VIX',
  dimension: 'Market Context',
  comparisonPolicy: 'SELF_HISTORY',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 1,
  help: {
    plainEnglish: 'The Cboe Volatility Index level in this fixture, plus a historical percentile when the fixture includes one.',
    howToRead: [
      'Quiet, normal, elevated, and extreme describe the volatility backdrop.',
      'A higher VIX means richer implied volatility, not a better market.',
    ],
    compareAgainst: ['Its own history. VIX has no sector cohort.'],
    caveats: ['This VIX reading is a fixture, not a live index print.', PERCENTILE_CAVEAT],
  },
});

add({
  id: 'market.highs-20d',
  label: 'New 20D highs',
  dimension: 'Market Context',
  comparisonPolicy: 'NONE',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 0,
  help: {
    plainEnglish: 'How many illustrated names printed a 20-day high on the snapshot date.',
    howToRead: ['Compare the count with new 20-day lows. The pair is the breadth of extremes.'],
    compareAgainst: ['New 20-day lows and the percent of names above the 50-day average.'],
    caveats: ['Counts depend on the illustrated universe. They are not NYSE advance/decline data.'],
  },
});

add({
  id: 'market.lows-20d',
  label: 'New 20D lows',
  dimension: 'Market Context',
  comparisonPolicy: 'NONE',
  interpretationMode: 'EXTREME_CONTEXT',
  precision: 0,
  help: {
    plainEnglish: 'How many illustrated names printed a 20-day low on the snapshot date.',
    howToRead: ['More lows than highs is a weaker internal backdrop. It is still a description, not a forecast.'],
    compareAgainst: ['New 20-day highs.'],
    caveats: ['Stale names are excluded from the count.'],
  },
});

add({
  id: 'market.sector-vs-spy',
  label: 'Sector ETF vs SPY, 3M',
  dimension: 'Market Context',
  unit: 'pp',
  comparisonPolicy: 'BENCHMARK_RELATIVE',
  interpretationMode: 'HIGHER_IS_STRONGER',
  precision: 1,
  help: {
    plainEnglish: 'The stock’s sector ETF return over three months minus SPY’s return over the same window.',
    formula: 'Sector excess = sector ETF 3-month return − SPY 3-month return.',
    howToRead: ['Positive means the sector has been leading the broad market. The stock can still disagree with its sector.'],
    compareAgainst: ['The stock’s own 3-month excess versus SPY and versus the sector ETF.'],
    caveats: ['This is sector context, not a substitute for the stock’s relative-strength matrix.'],
  },
});

export const METRIC_DEFINITIONS = definitions;

export function getMetricDefinition(id: string): MetricDefinition {
  const definition = METRIC_DEFINITIONS[id];
  if (!definition) {
    throw new Error(`Missing metric definition: ${id}`);
  }
  return definition;
}

export const PERCENTILE_METRIC_IDS = new Set<string>([
  'return.1d',
  'return.5d',
  'return.1m',
  'return.3m',
  'return.6m',
  'return.ytd',
  'return.1y',
  'distance.52w-high',
  'distance.52w-low',
  'trend.dist-sma20',
  'trend.dist-sma50',
  'trend.dist-sma200',
  'trend.slope-sma20',
  'trend.slope-sma50',
  'trend.slope-sma200',
  'trend.adx',
  'momentum.rsi14',
  'momentum.macd-histogram',
  'momentum.roc20',
  'momentum.roc63',
  'rs.spy.1m',
  'rs.spy.3m',
  'rs.spy.6m',
  'rs.spy.12m',
  'rs.sector.1m',
  'rs.sector.3m',
  'rs.sector.6m',
  'rs.sector.12m',
  'vol.atr-pct',
  'vol.realized-20d',
  'vol.realized-60d',
  'vol.bb-width',
  'vol.drawdown',
  'vol.max-drawdown-1y',
  'volume.rvol',
  'volume.dollar-avg-20d',
  'volume.cmf-20d',
]);
