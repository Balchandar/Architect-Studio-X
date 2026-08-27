import { describe, it, expect } from 'vitest';
import { deriveInsights } from './derive';
import { sampleGraph } from '@/lib/graph/__fixtures__/graph';

describe('estimateCost (via deriveInsights)', () => {
  it('totals every line item, not just the top contributors', () => {
    // sampleGraph yields 3 priced services + 3 fixed baselines = 6 line items,
    // so the total must exceed the sum of the (max 5) displayed contributors.
    const { cost } = deriveInsights(sampleGraph());
    expect(cost.topContributors.length).toBeLessThanOrEqual(5);
    const contributorSum = cost.topContributors.reduce((n, c) => n + c.monthly, 0);
    expect(cost.monthlyTotal).toBeGreaterThan(contributorSum);
  });

  it('keeps contributors sorted descending by monthly cost', () => {
    const { cost } = deriveInsights(sampleGraph());
    const monthlies = cost.topContributors.map((c) => c.monthly);
    const sortedDesc = [...monthlies].sort((a, b) => b - a);
    expect(monthlies).toEqual(sortedDesc);
  });
});
