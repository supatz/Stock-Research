import { formatPercent } from '@/domain/metrics/format';
import type { StockDetail } from '@/domain/types';

export interface ResearchBullet {
  id: string;
  text: string;
  evidence: string;
}

export interface ResearchBrief {
  headline: string;
  stance: 'constructive' | 'mixed' | 'cautious';
  positives: ResearchBullet[];
  negatives: ResearchBullet[];
  watchItems: ResearchBullet[];
  method: 'rule-based';
  generatedAt: string;
}

/**
 * On-demand, deterministic research brief.
 * Uses already-calculated technical and financial states — no LLM tokens.
 * Sector nuance is light and explicit so it stays inspectable.
 */
export function buildResearchBrief(detail: StockDetail): ResearchBrief {
  const { summary, dimensions, financials, relativeStrength, structure } = detail;
  const positives: ResearchBullet[] = [];
  const negatives: ResearchBullet[] = [];
  const watchItems: ResearchBullet[] = [];

  const trend = dimensions.find((item) => item.id === 'trend');
  const momentum = dimensions.find((item) => item.id === 'momentum');
  const vol = dimensions.find((item) => item.id === 'volatility');
  const volume = dimensions.find((item) => item.id === 'volume');
  const market = dimensions.find((item) => item.id === 'market');

  if (trend && /UPTREND/.test(trend.state)) {
    positives.push({
      id: 'trend',
      text: `${summary.ticker} is in a clean ${trend.state.replaceAll('_', ' ').toLowerCase()} with ADX context ${trend.primary}.`,
      evidence: trend.shortText,
    });
  } else if (trend && /DOWNTREND/.test(trend.state)) {
    negatives.push({
      id: 'trend',
      text: `Trend structure is ${trend.state.replaceAll('_', ' ').toLowerCase()}.`,
      evidence: trend.shortText,
    });
  } else if (trend) {
    watchItems.push({
      id: 'trend-mixed',
      text: 'Trend alignment is mixed — wait for a cleaner stack before overweighting momentum.',
      evidence: trend.shortText,
    });
  }

  if (relativeStrength.state === 'LEADING_MARKET_AND_SECTOR' || relativeStrength.state === 'LEADING_MARKET') {
    positives.push({
      id: 'rs',
      text: `Relative strength is ${relativeStrength.state.replaceAll('_', ' ').toLowerCase()} versus SPY / ${relativeStrength.sectorEtf}.`,
      evidence: `6M vs SPY ${formatPercent(relativeStrength.vsSpy.m6)}; 6M vs sector ${formatPercent(relativeStrength.vsSector.m6)}.`,
    });
  } else if (relativeStrength.state === 'LAGGING') {
    negatives.push({
      id: 'rs',
      text: 'The name is lagging its market and/or sector benchmarks over six months.',
      evidence: `6M vs SPY ${formatPercent(relativeStrength.vsSpy.m6)}; 6M vs sector ${formatPercent(relativeStrength.vsSector.m6)}.`,
    });
  }

  if (momentum && /EXTENDED|OVERBOUGHT/.test(momentum.state)) {
    watchItems.push({
      id: 'momentum-extended',
      text: 'Momentum is strong but extended — pullback risk is higher even if trend is intact.',
      evidence: momentum.shortText,
    });
  } else if (momentum && /WEAK|OVERSOLD/.test(momentum.state)) {
    negatives.push({
      id: 'momentum-weak',
      text: 'Momentum readings are weak relative to the stock’s recent tape.',
      evidence: momentum.shortText,
    });
  }

  if (vol && /ELEVATED|EXTREME/.test(vol.state)) {
    negatives.push({
      id: 'vol',
      text: 'Volatility is elevated versus this stock’s own history — position sizing matters more.',
      evidence: vol.shortText,
    });
  } else if (vol && /QUIET|NORMAL/.test(vol.state)) {
    positives.push({
      id: 'vol-calm',
      text: 'Volatility regime is relatively calm for this name.',
      evidence: vol.shortText,
    });
  }

  if (volume && /EXCEPTIONAL|ACTIVE/.test(volume.state)) {
    const withPrice = summary.dailyChangePct >= 0 ? 'with upside participation' : 'on a down day';
    watchItems.push({
      id: 'volume',
      text: `Participation is unusual ${withPrice}. Confirm whether the move is accumulation or distribution.`,
      evidence: volume.shortText,
    });
  }

  if (structure.distHigh != null && structure.distHigh > -3) {
    watchItems.push({
      id: 'near-high',
      text: 'Price is near the 52-week high — upside may need fresh catalysts or continued breadth.',
      evidence: `Distance from 52W high ${formatPercent(structure.distHigh)}.`,
    });
  }
  if (structure.drawdown != null && structure.drawdown < -15) {
    negatives.push({
      id: 'drawdown',
      text: 'The stock is in a meaningful drawdown from its recent peak.',
      evidence: `Current drawdown ${formatPercent(structure.drawdown)}.`,
    });
  }

  const annual = financials.annual;
  if (annual.length >= 2) {
    const latest = annual[annual.length - 1]!;
    const prior = annual[annual.length - 2]!;
    const revGrowth = prior.revenue ? ((latest.revenue / prior.revenue) - 1) * 100 : 0;
    const opDelta = latest.operatingMargin - prior.operatingMargin;
    if (revGrowth >= 8) {
      positives.push({
        id: 'rev-growth',
        text: `Revenue is growing about ${formatPercent(revGrowth)} year over year in the mock financial series.`,
        evidence: `${prior.period} → ${latest.period}: ${formatPercent(revGrowth)}.`,
      });
    } else if (revGrowth < 0) {
      negatives.push({
        id: 'rev-shrink',
        text: 'Revenue declined year over year in the latest mock annual print.',
        evidence: `${prior.period} → ${latest.period}: ${formatPercent(revGrowth)}.`,
      });
    }
    if (opDelta >= 1) {
      positives.push({
        id: 'margin-expand',
        text: `Operating margin expanded by ${formatPercent(opDelta, 1, false)} points versus the prior year.`,
        evidence: `${prior.operatingMargin.toFixed(1)}% → ${latest.operatingMargin.toFixed(1)}%.`,
      });
    } else if (opDelta <= -1) {
      negatives.push({
        id: 'margin-compress',
        text: 'Operating margin compressed versus the prior year.',
        evidence: `${prior.operatingMargin.toFixed(1)}% → ${latest.operatingMargin.toFixed(1)}%.`,
      });
    }

    // Sector-aware emphasis without inventing unknown fundamentals.
    if (summary.sectorId === 'information-technology' || summary.sectorId === 'communication-services') {
      watchItems.push({
        id: 'sector-growth',
        text: `For ${summary.sector}, prioritize relative strength, margin durability, and whether elevated RSI is trend strength or exhaustion.`,
        evidence: 'Sector lens applied from the current technical + financial snapshot.',
      });
    } else if (summary.sectorId === 'utilities' || summary.sectorId === 'consumer-staples') {
      watchItems.push({
        id: 'sector-defensive',
        text: `For ${summary.sector}, prioritize margin stability and whether the name is leading defensively or simply lagging a risk-on tape.`,
        evidence: 'Sector lens applied from the current technical + financial snapshot.',
      });
    } else if (summary.sectorId === 'energy') {
      watchItems.push({
        id: 'sector-energy',
        text: 'For Energy, weigh commodity-linked volatility and free-cash-flow quality alongside trend.',
        evidence: 'Sector lens applied from the current technical + financial snapshot.',
      });
    }
  }

  if (market && /RISK-OFF|DEFENSIVE|WEAKENING/.test(market.state)) {
    negatives.push({
      id: 'market',
      text: 'Broader market context is defensive or weakening — stock-specific strength faces a tougher tape.',
      evidence: market.shortText,
    });
  } else if (market && /RISK-ON|STRENGTH/.test(market.state)) {
    positives.push({
      id: 'market-tailwind',
      text: 'Market regime is supportive (risk-on / broad strength).',
      evidence: market.shortText,
    });
  }

  if (summary.quality !== 'good') {
    negatives.push({
      id: 'quality',
      text: `Data quality is ${summary.quality} — treat conclusions as provisional.`,
      evidence: summary.qualityMessage ?? `Quality state: ${summary.quality}.`,
    });
  }

  const stance =
    positives.length >= negatives.length + 2
      ? 'constructive'
      : negatives.length >= positives.length + 2
        ? 'cautious'
        : 'mixed';

  const headline =
    stance === 'constructive'
      ? `${summary.ticker}: constructive bias from trend/relative strength, with risks to monitor.`
      : stance === 'cautious'
        ? `${summary.ticker}: cautious bias — weak tape or risk factors dominate for now.`
        : `${summary.ticker}: mixed picture — positives and risks are both material.`;

  return {
    headline,
    stance,
    positives: positives.slice(0, 5),
    negatives: negatives.slice(0, 5),
    watchItems: watchItems.slice(0, 4),
    method: 'rule-based',
    generatedAt: new Date().toISOString(),
  };
}
