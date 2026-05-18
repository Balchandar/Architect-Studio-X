import { describe, it, expect } from 'vitest';
import {
  applyMutation,
  applyMutations,
  applyPlan,
  createMutation,
  createPlan,
} from './mutations';
import { sampleGraph, emptyGraph } from './__fixtures__/graph';

describe('mutation executor — add_service', () => {
  it('adds a service and leaves the input graph unchanged', () => {
    const g = sampleGraph();
    const before = JSON.stringify(g);
    const next = applyMutation(
      g,
      createMutation('add_service', {
        service: { name: 'Cache', type: 'cache' },
      }),
    );
    expect(next.services).toHaveLength(g.services.length + 1);
    expect(JSON.stringify(g)).toBe(before);
  });

  it('rejects add_service without required fields', () => {
    expect(() =>
      applyMutation(
        sampleGraph(),
        // @ts-expect-error intentional bad payload
        createMutation('add_service', { service: { name: 'x' } }),
      ),
    ).toThrow();
  });

  it('honors an explicit kebab-case id', () => {
    const next = applyMutation(
      emptyGraph(),
      createMutation('add_service', {
        service: { id: 'audit', name: 'Audit', type: 'compute' },
      }),
    );
    expect(next.services[0].id).toBe('audit');
  });
});

describe('mutation executor — remove_service', () => {
  it('cascades connection cleanup when a service is removed', () => {
    const next = applyMutation(
      sampleGraph(),
      createMutation('remove_service', { id: 'svc' }),
    );
    expect(next.services.find((s) => s.id === 'svc')).toBeUndefined();
    expect(next.connections.find((c) => c.source === 'svc')).toBeUndefined();
    expect(next.connections.find((c) => c.target === 'svc')).toBeUndefined();
  });

  it('throws when the id is unknown', () => {
    expect(() =>
      applyMutation(sampleGraph(), createMutation('remove_service', { id: 'nope' })),
    ).toThrow();
  });
});

describe('mutation executor — connections', () => {
  it('rejects add_connection with an unknown source', () => {
    expect(() =>
      applyMutation(
        sampleGraph(),
        createMutation('add_connection', {
          connection: {
            source: 'ghost',
            target: 'db',
            protocol: 'https',
            direction: 'unidirectional',
            encryption: 'tls',
          },
        }),
      ),
    ).toThrow();
  });

  it('update_connection only patches the named connection', () => {
    const next = applyMutation(
      sampleGraph(),
      createMutation('update_connection', {
        id: 'c1',
        patch: { encryption: 'mtls' },
      }),
    );
    const conn = next.connections.find((c) => c.id === 'c1')!;
    expect(conn.encryption).toBe('mtls');
    expect(next.connections.find((c) => c.id === 'c2')!.encryption).toBe('tls');
  });
});

describe('mutation executor — update_security / update_runtime', () => {
  it('merges partial encryption flags', () => {
    const next = applyMutation(
      sampleGraph(),
      createMutation('update_security', {
        serviceId: 'svc',
        encryption: { inTransit: false },
      }),
    );
    const svc = next.services.find((s) => s.id === 'svc')!;
    expect(svc.encryption?.atRest).toBe(true);
    expect(svc.encryption?.inTransit).toBe(false);
  });

  it('update_runtime swaps runtime atomically', () => {
    const next = applyMutation(
      sampleGraph(),
      createMutation('update_runtime', { serviceId: 'svc', runtime: 'lambda' }),
    );
    expect(next.services.find((s) => s.id === 'svc')!.runtime).toBe('lambda');
  });
});

describe('applyPlan — atomicity', () => {
  it('rejects the entire plan if any mutation is invalid', () => {
    const plan = createPlan('mixed', [
      createMutation('add_service', { service: { name: 'A', type: 'compute' } }),
      createMutation('remove_service', { id: 'missing' }),
    ]);
    const { graph, result } = applyPlan(sampleGraph(), plan);
    expect(result.ok).toBe(false);
    expect(graph.services).toHaveLength(sampleGraph().services.length);
  });

  it('applies all mutations atomically when valid', () => {
    const plan = createPlan('add svc + connection', [
      createMutation('add_service', {
        service: { id: 'cache', name: 'Cache', type: 'cache' },
      }),
      createMutation('add_connection', {
        connection: {
          source: 'svc',
          target: 'cache',
          protocol: 'tcp',
          direction: 'unidirectional',
          encryption: 'tls',
        },
      }),
    ]);
    const { graph, result } = applyPlan(sampleGraph(), plan);
    expect(result.ok).toBe(true);
    expect(graph.services.some((s) => s.id === 'cache')).toBe(true);
    expect(graph.connections.some((c) => c.target === 'cache')).toBe(true);
  });
});

describe('applyMutations — bumps updatedAt', () => {
  it('produces a new metadata.updatedAt timestamp', () => {
    const g = sampleGraph();
    const { graph: next } = applyMutations(g, [
      createMutation('add_service', { service: { name: 'X', type: 'compute' } }),
    ]);
    expect(next.metadata.updatedAt).not.toBe(g.metadata.updatedAt);
  });
});
