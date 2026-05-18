import { describe, it, expect } from 'vitest';
import { parsePlanResponse, rawPlanToPlan } from './planner';
import { sampleGraph } from '@/lib/graph/__fixtures__/graph';

describe('parsePlanResponse', () => {
  it('parses bare JSON', () => {
    const raw = parsePlanResponse('{"summary":"x","mutations":[]}');
    expect(raw.summary).toBe('x');
  });

  it('strips ```json fences', () => {
    const raw = parsePlanResponse('```json\n{"summary":"y","mutations":[]}\n```');
    expect(raw.summary).toBe('y');
  });

  it('throws on completely empty text', () => {
    expect(() => parsePlanResponse('not even json')).toThrow();
  });
});

describe('rawPlanToPlan — sanitizer drops hallucinated IDs', () => {
  it('drops update_service that targets a non-existent service', () => {
    const plan = rawPlanToPlan(
      {
        summary: 'bad',
        mutations: [
          {
            action: 'update_service',
            payload: { id: 'ghost', patch: { criticality: 'high' } },
          },
        ],
      },
      sampleGraph(),
    );
    expect(plan.mutations).toHaveLength(0);
    expect(plan.warnings?.[0]).toMatch(/unknown service/i);
  });

  it('drops add_connection that references a hallucinated id', () => {
    const plan = rawPlanToPlan(
      {
        summary: 'bad-conn',
        mutations: [
          {
            action: 'add_connection',
            payload: {
              connection: {
                source: 'svc',
                target: 'imaginary',
                protocol: 'https',
                direction: 'unidirectional',
                encryption: 'tls',
              },
            },
          },
        ],
      },
      sampleGraph(),
    );
    expect(plan.mutations).toHaveLength(0);
    expect(plan.warnings?.[0]).toMatch(/not in graph/);
  });

  it('keeps a valid two-step plan (add_service then add_connection)', () => {
    const plan = rawPlanToPlan(
      {
        summary: 'cache + link',
        mutations: [
          {
            action: 'add_service',
            payload: { service: { id: 'cache', name: 'Cache', type: 'cache' } },
          },
          {
            action: 'add_connection',
            payload: {
              connection: {
                source: 'svc',
                target: 'cache',
                protocol: 'tcp',
                direction: 'unidirectional',
                encryption: 'tls',
              },
            },
          },
        ],
      },
      sampleGraph(),
    );
    expect(plan.mutations).toHaveLength(2);
    expect(plan.warnings).toBeUndefined();
  });

  it('drops unknown actions', () => {
    const plan = rawPlanToPlan(
      {
        summary: 'bad-action',
        mutations: [{ action: 'delete_universe', payload: {} }],
      },
      sampleGraph(),
    );
    expect(plan.mutations).toHaveLength(0);
    expect(plan.warnings?.[0]).toMatch(/unknown action/i);
  });

  it('drops add_service missing required fields', () => {
    const plan = rawPlanToPlan(
      {
        summary: 'missing fields',
        mutations: [{ action: 'add_service', payload: { service: { name: 'X' } } }],
      },
      sampleGraph(),
    );
    expect(plan.mutations).toHaveLength(0);
  });

  it('preserves planner warnings end-to-end', () => {
    const plan = rawPlanToPlan(
      {
        summary: 's',
        warnings: ['cache-invalidation must be defined'],
        mutations: [],
      },
      sampleGraph(),
    );
    expect(plan.warnings).toContain('cache-invalidation must be defined');
  });
});
