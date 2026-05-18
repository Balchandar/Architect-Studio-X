import { describe, it, expect } from 'vitest';
import { runValidation } from './engine';
import { sampleGraph, emptyGraph } from '@/lib/graph/__fixtures__/graph';
import type { ArchitectureGraph } from '@/types/graph';

function withMutation(
  g: ArchitectureGraph,
  fn: (g: ArchitectureGraph) => ArchitectureGraph,
): ArchitectureGraph {
  return fn(structuredClone(g));
}

describe('validation rules', () => {
  it('flags a public-exposed datastore as critical', () => {
    const g = withMutation(sampleGraph(), (g) => {
      const db = g.services.find((s) => s.id === 'db')!;
      db.exposure = 'public';
      return g;
    });
    const insights = runValidation(g);
    const finding = insights.find((i) => i.id.startsWith('r.public-db.'));
    expect(finding?.severity).toBe('critical');
  });

  it('flags a plaintext connection', () => {
    const g = withMutation(sampleGraph(), (g) => {
      g.connections[0].encryption = 'none';
      return g;
    });
    const insights = runValidation(g);
    expect(insights.some((i) => i.id.startsWith('r.no-tls.'))).toBe(true);
  });

  it('flags missing-at-rest encryption on a datastore', () => {
    const g = withMutation(sampleGraph(), (g) => {
      const db = g.services.find((s) => s.id === 'db')!;
      db.encryption = { atRest: false, inTransit: true };
      return g;
    });
    const insights = runValidation(g);
    expect(insights.some((i) => i.id.startsWith('r.no-rest.'))).toBe(true);
  });

  it('flags single-region deployments', () => {
    const insights = runValidation(sampleGraph());
    expect(insights.some((i) => i.id === 'r.single-region')).toBe(true);
  });

  it('flags missing observability', () => {
    const insights = runValidation(sampleGraph());
    expect(insights.some((i) => i.id === 'r.missing-obs')).toBe(true);
  });

  it('does not flag missing observability when an observability service exists', () => {
    const g = withMutation(sampleGraph(), (g) => {
      g.services.push({
        id: 'obs',
        type: 'observability',
        name: 'Prometheus',
        runtime: 'kubernetes',
        region: 'us-east-1',
        criticality: 'medium',
        tags: ['metrics'],
      });
      return g;
    });
    const insights = runValidation(g);
    expect(insights.some((i) => i.id === 'r.missing-obs')).toBe(false);
  });

  it('flags a critical datastore with no peer (SPOF)', () => {
    const insights = runValidation(sampleGraph());
    expect(insights.some((i) => i.id.startsWith('r.spof.'))).toBe(true);
  });

  it('returns no findings on an empty graph', () => {
    expect(runValidation(emptyGraph())).toHaveLength(0);
  });

  it('flags missing WAF in front of a gateway', () => {
    const insights = runValidation(sampleGraph());
    expect(insights.some((i) => i.id === 'r.no-waf')).toBe(true);
  });

  it('does not flag WAF when a security/waf service exists', () => {
    const g = withMutation(sampleGraph(), (g) => {
      g.services.push({
        id: 'waf',
        type: 'security',
        name: 'WAF',
        runtime: 'managed',
        region: 'us-east-1',
        criticality: 'medium',
        tags: [],
      });
      return g;
    });
    const insights = runValidation(g);
    expect(insights.some((i) => i.id === 'r.no-waf')).toBe(false);
  });
});
