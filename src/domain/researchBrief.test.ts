import { describe, expect, it } from 'vitest';
import { getBuiltMock } from '@/data/mock/build';
import { buildResearchBrief } from '@/domain/researchBrief';

describe('research brief', () => {
  it('builds an on-demand rule-based brief with positives and negatives', () => {
    const nvda = getBuiltMock().byTicker.get('NVDA')!.detail;
    const brief = buildResearchBrief(nvda);
    expect(brief.method).toBe('rule-based');
    expect(brief.headline).toContain('NVDA');
    expect(brief.positives.length + brief.negatives.length + brief.watchItems.length).toBeGreaterThan(0);
  });
});
