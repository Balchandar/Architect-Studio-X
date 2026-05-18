import { describe, it, expect } from 'vitest';
import { diffGraphs, diffTheme, groupDiffByService } from './diff';
import { sampleGraph, emptyGraph } from './__fixtures__/graph';

describe('diffGraphs', () => {
  it('treats null baseline as all-added', () => {
    const after = sampleGraph();
    const entries = diffGraphs(null, after);
    const adds = entries.filter((e) => e.kind === 'service-added');
    expect(adds).toHaveLength(after.services.length);
  });

  it('returns no entries for identical graphs', () => {
    const g = sampleGraph();
    const entries = diffGraphs(g, structuredClone(g));
    expect(entries).toHaveLength(0);
  });

  it('reports service-added when a new service appears', () => {
    const before = sampleGraph();
    const after = structuredClone(before);
    after.services.push({
      id: 'obs',
      type: 'observability',
      name: 'Prometheus',
      runtime: 'kubernetes',
      region: 'us-east-1',
      criticality: 'medium',
      tags: [],
    });
    const entries = diffGraphs(before, after);
    expect(entries.some((e) => e.kind === 'service-added' && e.id === 'obs')).toBe(true);
  });

  it('reports semantic field changes on a modified service', () => {
    const before = sampleGraph();
    const after = structuredClone(before);
    after.services.find((s) => s.id === 'svc')!.region = 'eu-west-1';
    const entries = diffGraphs(before, after);
    const modified = entries.find((e) => e.kind === 'service-modified' && e.id === 'svc');
    expect(modified?.detail).toMatch(/region moved/);
  });

  it('reports a removed connection', () => {
    const before = sampleGraph();
    const after = structuredClone(before);
    after.connections = after.connections.filter((c) => c.id !== 'c1');
    const entries = diffGraphs(before, after);
    expect(entries.some((e) => e.kind === 'connection-removed' && e.id === 'c1')).toBe(true);
  });
});

describe('diffTheme', () => {
  it('tags a TLS connection add as security-improved', () => {
    const before = emptyGraph();
    const after = sampleGraph();
    const entries = diffGraphs(before, after);
    const connAdd = entries.find((e) => e.kind === 'connection-added' && e.id === 'c1');
    expect(connAdd).toBeTruthy();
    expect(diffTheme(before, after, connAdd!)).toBe('security-improved');
  });

  it('tags an observability service add as observability-improved', () => {
    const before = sampleGraph();
    const after = structuredClone(before);
    after.services.push({
      id: 'obs',
      type: 'observability',
      name: 'Prometheus',
      runtime: 'kubernetes',
      region: 'us-east-1',
      criticality: 'medium',
      tags: [],
    });
    const entries = diffGraphs(before, after);
    const add = entries.find((e) => e.id === 'obs')!;
    expect(diffTheme(before, after, add)).toBe('observability-improved');
  });
});

describe('groupDiffByService', () => {
  it('groups connection entries under the source service', () => {
    const before = sampleGraph();
    const after = structuredClone(before);
    after.connections.find((c) => c.id === 'c1')!.encryption = 'mtls';
    const entries = diffGraphs(before, after);
    const groups = groupDiffByService(before, after, entries);
    const api = groups.find((g) => g.serviceId === 'api');
    expect(api?.entries.length).toBeGreaterThan(0);
  });
});
