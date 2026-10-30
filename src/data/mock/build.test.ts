import { describe, expect, it } from 'vitest';
import { getBuiltMock } from '@/data/mock/build';
import { METRIC_DEFINITIONS } from '@/domain/metrics/definitions';
import { isKnownState } from '@/domain/metrics/labels';

describe('mock snapshot stories', () => {
  const data = getBuiltMock();

  it('covers a multi-sector illustrated universe', () => {
    expect(data.stocks.length).toBeGreaterThanOrEqual(30);
    expect(new Set(data.stocks.map((stock) => stock.summary.sectorId)).size).toBe(11);
    expect(data.manifest.mode).toBe('mock');
  });

  it('separates benchmark-relative stories', () => {
    const avgo = data.byTicker.get('AVGO')!;
    const xom = data.byTicker.get('XOM')!;
    const nvda = data.byTicker.get('NVDA')!;
    const unh = data.byTicker.get('UNH')!;
    expect({
      avgoSpy: avgo.detail.relativeStrength.vsSpy.m6,
      avgoSector: avgo.detail.relativeStrength.vsSector.m6,
      avgoState: avgo.summary.rsState,
      xomSpy: xom.detail.relativeStrength.vsSpy.m6,
      xomSector: xom.detail.relativeStrength.vsSector.m6,
      xomState: xom.summary.rsState,
      nvdaSpy: nvda.detail.relativeStrength.vsSpy.m6,
      nvdaSector: nvda.detail.relativeStrength.vsSector.m6,
      unhSpy: unh.detail.relativeStrength.vsSpy.m6,
      unhSector: unh.detail.relativeStrength.vsSector.m6,
      unhState: unh.summary.rsState,
    }).toMatchObject({
      avgoState: 'LEADING_MARKET',
      xomState: 'LEADING_SECTOR',
      unhState: 'LAGGING',
    });
    expect(avgo.detail.relativeStrength.vsSpy.m6 ?? 0).toBeGreaterThan(0.5);
    expect(avgo.detail.relativeStrength.vsSector.m6 ?? 0).toBeLessThan(-0.5);
    expect(xom.detail.relativeStrength.vsSpy.m6 ?? 0).toBeLessThan(-0.5);
    expect(xom.detail.relativeStrength.vsSector.m6 ?? 0).toBeGreaterThan(0.5);
    expect(nvda.detail.relativeStrength.vsSpy.m6 ?? 0).toBeGreaterThan(0);
    expect(nvda.detail.relativeStrength.vsSector.m6 ?? 0).toBeGreaterThan(0);
  });

  it('shows risk, extension, fallback, stale, and short-history cases', () => {
    const nvda = data.byTicker.get('NVDA')!.detail.metrics['vol.atr-pct']!;
    const nee = data.byTicker.get('NEE')!.detail.metrics['vol.atr-pct']!;
    const amd = data.byTicker.get('AMD')!.detail.metrics['return.1m']!;
    const aapl = data.byTicker.get('AAPL')!.detail.metrics['momentum.rsi14']!;
    const spg = data.byTicker.get('SPG')!;
    const pep = data.byTicker.get('PEP')!;
    const ba = data.byTicker.get('BA')!;
    const cost = data.byTicker.get('COST')!;

    expect(nvda.historical?.percentile).toBe(91);
    expect(['VOL_ELEVATED', 'VOL_EXTREME']).toContain(nvda.interpretation.state);
    expect(aapl.historical?.percentile).toBe(86);
    expect(aapl.interpretation.state).toBe('MOMENTUM_EXTENDED');
    expect(nee.sectorRelative?.fallbackLevel).toBe('sector');
    expect(nee.sectorRelative?.cohortLabel).toBe('Utilities');
    expect(nee.sectorRelative?.sampleSize).toBe(26);
    expect(nee.sectorRelative?.fallbackDetail).toMatch(/n=14/);
    expect(amd.sectorRelative?.fallbackLevel).toBe('sector');
    expect(amd.sectorRelative?.cohortLabel).toBe('Technology');
    expect(aapl.sectorRelative?.fallbackLevel).toBeUndefined();
    expect(spg.detail.metrics['momentum.rsi14']?.historical?.percentile).toBeNull();
    expect(spg.detail.metrics['momentum.rsi14']?.dataQuality?.message).toMatch(/126 valid observations/);
    expect(spg.summary.quality).toBe('insufficient');
    expect(pep.summary.quality).toBe('stale');
    expect(pep.summary.asOf).toBe('2026-10-07');
    expect(pep.detail.metrics['momentum.rsi14']?.sectorRelative?.percentile).toBeNull();
    expect(ba.detail.metrics['volume.cmf-20d']?.rawValue).toBeNull();
    expect(ba.detail.metrics['volume.cmf-20d']?.dataQuality?.status).toBe('partial');
    expect(cost.summary.distance52wHigh ?? -100).toBeGreaterThan(-5);
    expect(ba.detail.structure.drawdown ?? 0).toBeLessThan(-15);
  });

  it('includes deterministic financial detail periods', () => {
    const nvda = data.byTicker.get('NVDA')!.detail.financials;
    expect(nvda.annual).toHaveLength(10);
    expect(nvda.quarterly.length).toBeGreaterThanOrEqual(15);
    expect(nvda.annual[0]?.period).toBe('FY2017');
    expect(nvda.annual.at(-1)?.period).toBe('FY2026');
    expect(nvda.quarterly.at(-1)?.period).toBe('2026 Q3');
    expect(nvda.annual.at(-1)?.operatingIncome).toBeGreaterThan(0);
    expect(nvda.annual.at(-1)?.pe).toBeGreaterThan(0);
    const detail = data.byTicker.get('NVDA')!.detail;
    expect(detail.dimensions.some((item) => item.id === 'vwap')).toBe(true);
    expect(detail.keyStatistics.marketCap).toBeGreaterThan(0);
    expect(nvda.provenance).toMatch(/mock fundamentals/i);
  });

  it('defines help for every observation and a known state label', () => {
    const states = new Set<string>();
    for (const stock of data.stocks) {
      for (const metric of Object.values(stock.detail.metrics)) {
        expect(METRIC_DEFINITIONS[metric.metricId]).toBeTruthy();
        states.add(metric.interpretation.state);
        expect(metric.displayValue).not.toBe('0');
      }
    }
    for (const metric of data.overview.metrics) {
      expect(METRIC_DEFINITIONS[metric.metricId]).toBeTruthy();
      states.add(metric.interpretation.state);
    }
    for (const state of states) {
      expect(isKnownState(state)).toBe(true);
    }
    const blob = JSON.stringify(data.overview.regime);
    expect(blob.toLowerCase()).not.toContain('strong buy');
  });
});
