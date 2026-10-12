import { describe, expect, it } from 'vitest';
import {
  formatCohort,
  formatPercent,
  formatPercentile,
} from '@/domain/metrics/format';
import { referenceCopy } from '@/domain/references';

describe('formatPercentile', () => {
  it('formats ordinals and the unavailable state', () => {
    expect(formatPercentile(1)).toBe('1st');
    expect(formatPercentile(2)).toBe('2nd');
    expect(formatPercentile(3)).toBe('3rd');
    expect(formatPercentile(11)).toBe('11th');
    expect(formatPercentile(12)).toBe('12th');
    expect(formatPercentile(13)).toBe('13th');
    expect(formatPercentile(21)).toBe('21st');
    expect(formatPercentile(91)).toBe('91st');
    expect(formatPercentile(null)).toBe('—');
    expect(formatPercentile(undefined)).toBe('—');
    expect(formatPercentile(Number.NaN)).toBe('—');
  });
});

describe('format helpers', () => {
  it('keeps percent signs and cohort sample size visible', () => {
    expect(formatPercent(2.74, 1, false)).toBe('2.7%');
    expect(formatPercent(-4.2)).toBe('-4.2%');
    expect(formatPercent(null)).toBe('—');
    expect(formatCohort('Utilities', 26)).toBe('Utilities · n=26');
  });
});

describe('reference copy', () => {
  it('builds the page and section clipboard string', () => {
    expect(referenceCopy('section.stock.trend')).toBe('Stock Detail / Trend [section.stock.trend]');
    expect(referenceCopy('page.market')).toBe('Market [page.market]');
  });
});
