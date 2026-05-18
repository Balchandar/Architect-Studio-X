import type { ArchitectureGraph } from '@/types/graph';
import type { Insight } from '@/types/insights';
import type { AIModel } from '@/types/intent';
import type { MutationPlan } from '@/types/mutations';
import { runValidation } from '@/lib/validation/engine';
import { createMutation, createPlan } from '@/lib/graph/mutations';
import type { AIProvider, AISuggestionResult, PlannerRequest } from './provider';

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

const labelByModel: Record<AIModel, string> = {
  auto: 'Demo Planner (offline)',
  gpt: 'GPT (mock)',
  claude: 'Claude (mock)',
  gemini: 'Gemini (mock)',
  ollama: 'Ollama (local mock)',
};

/**
 * Build a deterministic plan for the mock provider. Inspects the intent + the
 * current graph and proposes a small, sensible set of mutations so the
 * end-to-end pipeline works offline.
 */
function deterministicPlan(req: PlannerRequest): MutationPlan {
  const { graph, prompt } = req;
  const lower = (prompt ?? '').toLowerCase();
  const mutations = [];
  let summary = 'No structural changes proposed.';
  const warnings: string[] = [];

  const hasCache = graph.services.some((s) => s.type === 'cache');
  const hasObservability = graph.services.some((s) => s.type === 'observability');
  const hasMultiRegion = graph.services.some(
    (s) => s.region !== 'us-east-1' && s.region !== 'global',
  );

  if (lower.includes('multi-region') || lower.includes('failover') || lower.includes('disaster')) {
    summary = 'Add EU region for failover.';
    mutations.push(
      createMutation(
        'add_region',
        { region: 'eu-west-1', applyToServiceIds: [] },
        { source: 'ai', reason: 'Improve disaster recovery posture' },
      ),
    );
    const criticalCompute = graph.services.find(
      (s) => s.type === 'compute' && s.criticality === 'critical',
    );
    if (criticalCompute) {
      mutations.push(
        createMutation(
          'add_service',
          {
            service: {
              name: `${criticalCompute.name} (EU)`,
              type: 'compute',
              runtime: criticalCompute.runtime,
              region: 'eu-west-1',
              criticality: 'critical',
              tags: [...criticalCompute.tags, 'failover'],
              exposure: criticalCompute.exposure,
              encryption: criticalCompute.encryption,
              observability: true,
            },
          },
          { source: 'ai', reason: `EU peer for ${criticalCompute.name}` },
        ),
      );
    }
  } else if (!hasCache) {
    summary = 'Introduce a Redis cache layer for hot reads.';
    mutations.push(
      createMutation(
        'add_service',
        {
          service: {
            name: 'Redis Cache',
            type: 'cache',
            runtime: 'managed',
            region: 'us-east-1',
            criticality: 'high',
            tags: ['cache'],
            exposure: 'internal',
            encryption: { atRest: true, inTransit: true },
            observability: true,
          },
        },
        { source: 'ai', reason: 'Reduce read latency on hot endpoints' },
      ),
    );
    warnings.push('Cache invalidation strategy must be defined.');
  } else if (!hasObservability) {
    summary = 'Add observability stack (Prometheus + Grafana).';
    mutations.push(
      createMutation(
        'add_service',
        {
          service: {
            name: 'Prometheus',
            type: 'observability',
            runtime: 'kubernetes',
            region: 'us-east-1',
            criticality: 'medium',
            tags: ['metrics'],
            exposure: 'internal',
            observability: true,
          },
        },
        { source: 'ai', reason: 'Baseline metrics collection' },
      ),
      createMutation(
        'add_service',
        {
          service: {
            name: 'Grafana',
            type: 'observability',
            runtime: 'kubernetes',
            region: 'us-east-1',
            criticality: 'medium',
            tags: ['dashboards'],
            exposure: 'internal',
          },
        },
        { source: 'ai', reason: 'Operator dashboards' },
      ),
    );
  } else if (!hasMultiRegion) {
    summary = 'Promote ledger / critical compute to multi-region.';
    const target = graph.services.find(
      (s) => s.type === 'compute' && s.criticality === 'critical',
    );
    if (target) {
      mutations.push(
        createMutation(
          'update_service',
          { id: target.id, patch: { region: 'multi-region' } },
          { source: 'ai', reason: 'Reduce regional blast radius' },
        ),
      );
    }
  }

  // Always tighten security on services missing in-transit encryption.
  for (const s of graph.services) {
    if (s.encryption && s.encryption.inTransit === false) {
      mutations.push(
        createMutation(
          'update_security',
          { serviceId: s.id, encryption: { inTransit: true } },
          { source: 'ai', reason: 'Enforce TLS for internal traffic' },
        ),
      );
    }
  }

  return createPlan(summary, mutations, {
    rationale:
      'Deterministic mock planner. Configure a real Ollama or OpenAI-compatible provider for richer plans.',
    source: 'ai',
    warnings: warnings.length ? warnings : undefined,
  });
}

export function createMockProvider(id: AIModel = 'auto'): AIProvider {
  return {
    id,
    label: labelByModel[id],
    async validate(graph: ArchitectureGraph): Promise<Insight[]> {
      await wait(60);
      return runValidation(graph);
    },
    async suggest(graph: ArchitectureGraph): Promise<AISuggestionResult> {
      await wait(80);
      return { insights: runValidation(graph) };
    },
    async plan(req: PlannerRequest): Promise<MutationPlan> {
      await wait(140);
      return deterministicPlan(req);
    },
    async summarize(graph: ArchitectureGraph): Promise<string> {
      const services = graph.services.length;
      const conns = graph.connections.length;
      return `${graph.metadata.name}: ${services} services, ${conns} connections.`;
    },
  };
}
