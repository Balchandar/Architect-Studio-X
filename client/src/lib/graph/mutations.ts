// Deterministic mutation executor. The ONLY place that produces a new
// ArchitectureGraph from a previous one. All graph edits — user, AI, or
// template — must flow through here.

import { nanoid } from 'nanoid';
import type {
  ArchitectureGraph,
  Connection,
  ServiceNode,
} from '@/types/graph';
import type {
  GraphMutation,
  MutationAction,
  MutationPayloadByAction,
  MutationPlan,
  MutationResult,
} from '@/types/mutations';

const SERVICE_DEFAULTS: Pick<
  ServiceNode,
  'runtime' | 'region' | 'criticality' | 'tags' | 'exposure' | 'encryption' | 'observability'
> = {
  runtime: 'kubernetes',
  region: 'us-east-1',
  criticality: 'medium',
  tags: [],
  exposure: 'internal',
  encryption: { atRest: true, inTransit: true },
  observability: false,
};

export function createMutation<A extends MutationAction>(
  action: A,
  payload: MutationPayloadByAction[A],
  opts: { reason?: string; source?: 'user' | 'ai' } = {},
): GraphMutation<A> {
  return {
    id: `mut_${nanoid(8)}`,
    action,
    payload,
    reason: opts.reason,
    source: opts.source ?? 'user',
    createdAt: new Date().toISOString(),
  };
}

export function createPlan(
  summary: string,
  mutations: GraphMutation[],
  opts: { rationale?: string; source?: 'user' | 'ai'; warnings?: string[] } = {},
): MutationPlan {
  return {
    id: `plan_${nanoid(8)}`,
    summary,
    rationale: opts.rationale,
    mutations,
    source: opts.source ?? 'user',
    createdAt: new Date().toISOString(),
    warnings: opts.warnings,
  };
}

function bumpUpdatedAt(graph: ArchitectureGraph): ArchitectureGraph {
  return {
    ...graph,
    metadata: { ...graph.metadata, updatedAt: new Date().toISOString() },
  };
}

function ensureServiceShape(
  partial: MutationPayloadByAction['add_service']['service'],
): ServiceNode {
  return {
    id: partial.id ?? `svc_${nanoid(6)}`,
    type: partial.type,
    name: partial.name,
    description: partial.description,
    runtime: partial.runtime ?? SERVICE_DEFAULTS.runtime,
    region: partial.region ?? SERVICE_DEFAULTS.region,
    criticality: partial.criticality ?? SERVICE_DEFAULTS.criticality,
    tags: partial.tags ?? SERVICE_DEFAULTS.tags,
    exposure: partial.exposure ?? SERVICE_DEFAULTS.exposure,
    encryption: partial.encryption ?? { ...SERVICE_DEFAULTS.encryption! },
    observability: partial.observability ?? SERVICE_DEFAULTS.observability,
    position: partial.position,
    group: partial.group,
  };
}

function ensureConnectionShape(
  partial: MutationPayloadByAction['add_connection']['connection'],
): Connection {
  return {
    id: partial.id ?? `c_${nanoid(6)}`,
    source: partial.source,
    target: partial.target,
    protocol: partial.protocol,
    direction: partial.direction,
    encryption: partial.encryption,
    label: partial.label,
    async: partial.async,
  };
}

/**
 * Apply a single mutation deterministically. Returns a new graph; the input
 * graph is never modified. Throws on validation errors so callers can collect
 * and surface them to the user.
 */
export function applyMutation(
  graph: ArchitectureGraph,
  mutation: GraphMutation,
): ArchitectureGraph {
  switch (mutation.action) {
    case 'add_service': {
      const p = mutation.payload as MutationPayloadByAction['add_service'];
      if (!p?.service?.name || !p?.service?.type) {
        throw new Error('add_service requires service.name and service.type');
      }
      const node = ensureServiceShape(p.service);
      if (graph.services.some((s) => s.id === node.id)) {
        throw new Error(`service id ${node.id} already exists`);
      }
      return bumpUpdatedAt({ ...graph, services: [...graph.services, node] });
    }

    case 'remove_service': {
      const p = mutation.payload as MutationPayloadByAction['remove_service'];
      if (!graph.services.some((s) => s.id === p.id)) {
        throw new Error(`remove_service: unknown id ${p.id}`);
      }
      return bumpUpdatedAt({
        ...graph,
        services: graph.services.filter((s) => s.id !== p.id),
        connections: graph.connections.filter(
          (c) => c.source !== p.id && c.target !== p.id,
        ),
      });
    }

    case 'update_service': {
      const p = mutation.payload as MutationPayloadByAction['update_service'];
      if (!graph.services.some((s) => s.id === p.id)) {
        throw new Error(`update_service: unknown id ${p.id}`);
      }
      return bumpUpdatedAt({
        ...graph,
        services: graph.services.map((s) =>
          s.id === p.id ? { ...s, ...p.patch, id: s.id } : s,
        ),
      });
    }

    case 'add_connection': {
      const p = mutation.payload as MutationPayloadByAction['add_connection'];
      const conn = ensureConnectionShape(p.connection);
      const ids = new Set(graph.services.map((s) => s.id));
      if (!ids.has(conn.source)) {
        throw new Error(`add_connection: unknown source ${conn.source}`);
      }
      if (!ids.has(conn.target)) {
        throw new Error(`add_connection: unknown target ${conn.target}`);
      }
      if (graph.connections.some((c) => c.id === conn.id)) {
        throw new Error(`connection id ${conn.id} already exists`);
      }
      return bumpUpdatedAt({
        ...graph,
        connections: [...graph.connections, conn],
      });
    }

    case 'remove_connection': {
      const p = mutation.payload as MutationPayloadByAction['remove_connection'];
      if (!graph.connections.some((c) => c.id === p.id)) {
        throw new Error(`remove_connection: unknown id ${p.id}`);
      }
      return bumpUpdatedAt({
        ...graph,
        connections: graph.connections.filter((c) => c.id !== p.id),
      });
    }

    case 'update_connection': {
      const p = mutation.payload as MutationPayloadByAction['update_connection'];
      if (!graph.connections.some((c) => c.id === p.id)) {
        throw new Error(`update_connection: unknown id ${p.id}`);
      }
      return bumpUpdatedAt({
        ...graph,
        connections: graph.connections.map((c) =>
          c.id === p.id ? { ...c, ...p.patch, id: c.id } : c,
        ),
      });
    }

    case 'add_region': {
      const p = mutation.payload as MutationPayloadByAction['add_region'];
      if (!p?.region) throw new Error('add_region requires region');
      const ids = new Set(p.applyToServiceIds ?? []);
      const services = ids.size
        ? graph.services.map((s) => (ids.has(s.id) ? { ...s, region: p.region } : s))
        : graph.services;
      // Record the region on metadata (deduped) so the change is meaningful
      // even when no specific services are relabeled — this is the documented
      // "region recorded on metadata only" behavior for an empty id list.
      const regions = graph.metadata.regions ?? [];
      const nextRegions = regions.includes(p.region) ? regions : [...regions, p.region];
      return bumpUpdatedAt({
        ...graph,
        services,
        metadata: {
          ...graph.metadata,
          regions: nextRegions,
        },
      });
    }

    case 'update_runtime': {
      const p = mutation.payload as MutationPayloadByAction['update_runtime'];
      if (!graph.services.some((s) => s.id === p.serviceId)) {
        throw new Error(`update_runtime: unknown service ${p.serviceId}`);
      }
      return bumpUpdatedAt({
        ...graph,
        services: graph.services.map((s) =>
          s.id === p.serviceId ? { ...s, runtime: p.runtime } : s,
        ),
      });
    }

    case 'update_security': {
      const p = mutation.payload as MutationPayloadByAction['update_security'];
      if (!graph.services.some((s) => s.id === p.serviceId)) {
        throw new Error(`update_security: unknown service ${p.serviceId}`);
      }
      return bumpUpdatedAt({
        ...graph,
        services: graph.services.map((s) => {
          if (s.id !== p.serviceId) return s;
          return {
            ...s,
            encryption: p.encryption
              ? {
                  atRest: p.encryption.atRest ?? s.encryption?.atRest ?? true,
                  inTransit: p.encryption.inTransit ?? s.encryption?.inTransit ?? true,
                }
              : s.encryption,
            exposure: p.exposure ?? s.exposure,
            criticality: p.criticality ?? s.criticality,
            observability: p.observability ?? s.observability,
          };
        }),
      });
    }

    default: {
      const exhaustive: never = mutation.action;
      throw new Error(`unknown mutation action: ${String(exhaustive)}`);
    }
  }
}

/**
 * Apply many mutations sequentially. If any mutation fails, it is collected
 * into `errors` and skipped — the remaining mutations still apply on the last
 * good graph. Mutation pipelines should always be ATOMIC at the plan level
 * (callers can decide to throw away the result if errors.length > 0).
 */
export function applyMutations(
  graph: ArchitectureGraph,
  mutations: GraphMutation[],
): { graph: ArchitectureGraph; result: MutationResult } {
  let next = graph;
  const applied: GraphMutation[] = [];
  const errors: MutationResult['errors'] = [];
  for (const m of mutations) {
    try {
      next = applyMutation(next, m);
      applied.push(m);
    } catch (err) {
      errors.push({ mutationId: m.id, message: (err as Error).message });
    }
  }
  return { graph: next, result: { ok: errors.length === 0, applied, errors } };
}

/**
 * Apply a plan atomically. If ANY mutation fails, the original graph is
 * returned unchanged. This is the path the approval workflow uses.
 */
export function applyPlan(
  graph: ArchitectureGraph,
  plan: MutationPlan,
): { graph: ArchitectureGraph; result: MutationResult } {
  const { graph: next, result } = applyMutations(graph, plan.mutations);
  if (!result.ok) return { graph, result };
  return { graph: next, result };
}

export function describeMutation(m: GraphMutation): string {
  switch (m.action) {
    case 'add_service': {
      const p = m.payload as MutationPayloadByAction['add_service'];
      return `Add service: ${p.service.name} (${p.service.type})`;
    }
    case 'remove_service': {
      const p = m.payload as MutationPayloadByAction['remove_service'];
      return `Remove service: ${p.id}`;
    }
    case 'update_service': {
      const p = m.payload as MutationPayloadByAction['update_service'];
      const fields = Object.keys(p.patch).join(', ');
      return `Update service ${p.id} (${fields || 'no fields'})`;
    }
    case 'add_connection': {
      const p = m.payload as MutationPayloadByAction['add_connection'];
      return `Add connection ${p.connection.source} → ${p.connection.target} (${p.connection.protocol})`;
    }
    case 'remove_connection': {
      const p = m.payload as MutationPayloadByAction['remove_connection'];
      return `Remove connection ${p.id}`;
    }
    case 'update_connection': {
      const p = m.payload as MutationPayloadByAction['update_connection'];
      return `Update connection ${p.id}`;
    }
    case 'add_region': {
      const p = m.payload as MutationPayloadByAction['add_region'];
      return `Add region ${p.region}${p.applyToServiceIds?.length ? ` (${p.applyToServiceIds.length} services)` : ''}`;
    }
    case 'update_runtime': {
      const p = m.payload as MutationPayloadByAction['update_runtime'];
      return `Update runtime of ${p.serviceId} → ${p.runtime}`;
    }
    case 'update_security': {
      const p = m.payload as MutationPayloadByAction['update_security'];
      return `Update security of ${p.serviceId}`;
    }
  }
}

/** Short, human-friendly label for a mutation, used in grouped views. */
export function mutationShortLabel(m: GraphMutation): string {
  switch (m.action) {
    case 'add_service': {
      const p = m.payload as MutationPayloadByAction['add_service'];
      return `Added ${p.service.type}: ${p.service.name}`;
    }
    case 'remove_service':
      return 'Removed service';
    case 'update_service': {
      const p = m.payload as MutationPayloadByAction['update_service'];
      const fields = Object.keys(p.patch).join(', ');
      return `Updated ${fields || 'fields'}`;
    }
    case 'add_connection': {
      const p = m.payload as MutationPayloadByAction['add_connection'];
      return `Added ${p.connection.protocol} link to ${p.connection.target}`;
    }
    case 'remove_connection':
      return 'Removed connection';
    case 'update_connection':
      return 'Updated connection';
    case 'add_region': {
      const p = m.payload as MutationPayloadByAction['add_region'];
      return `Added region ${p.region}`;
    }
    case 'update_runtime': {
      const p = m.payload as MutationPayloadByAction['update_runtime'];
      return `Runtime → ${p.runtime}`;
    }
    case 'update_security':
      return 'Tightened security';
  }
}

/**
 * Bucket a list of mutations by the service id they primarily affect.
 * `__global__` collects mutations that don't have a clear service anchor
 * (e.g. add_region without a service list).
 */
export function groupMutationsByService(
  mutations: GraphMutation[],
): { serviceId: string; mutations: GraphMutation[] }[] {
  const buckets = new Map<string, GraphMutation[]>();
  const push = (key: string, m: GraphMutation) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(m);
  };
  for (const m of mutations) {
    switch (m.action) {
      case 'add_service': {
        const p = m.payload as MutationPayloadByAction['add_service'];
        push(p.service.id ?? `__new__:${p.service.name}`, m);
        break;
      }
      case 'remove_service':
      case 'update_service':
      case 'update_runtime':
      case 'update_security': {
        const p = m.payload as { id?: string; serviceId?: string };
        push(p.id ?? p.serviceId ?? '__global__', m);
        break;
      }
      case 'add_connection': {
        const p = m.payload as MutationPayloadByAction['add_connection'];
        push(p.connection.source, m);
        break;
      }
      case 'remove_connection':
      case 'update_connection':
        push('__global__', m);
        break;
      case 'add_region': {
        const p = m.payload as MutationPayloadByAction['add_region'];
        const ids = p.applyToServiceIds ?? [];
        if (ids.length === 0) push('__global__', m);
        else for (const id of ids) push(id, m);
        break;
      }
    }
  }
  return [...buckets.entries()].map(([serviceId, mutations]) => ({
    serviceId,
    mutations,
  }));
}

export function affectedNodeIds(m: GraphMutation): string[] {
  switch (m.action) {
    case 'add_service':
      return [];
    case 'remove_service':
      return [(m.payload as MutationPayloadByAction['remove_service']).id];
    case 'update_service':
      return [(m.payload as MutationPayloadByAction['update_service']).id];
    case 'add_connection': {
      const p = m.payload as MutationPayloadByAction['add_connection'];
      return [p.connection.source, p.connection.target];
    }
    case 'remove_connection':
      return [];
    case 'update_connection':
      return [];
    case 'add_region':
      return (m.payload as MutationPayloadByAction['add_region']).applyToServiceIds ?? [];
    case 'update_runtime':
      return [(m.payload as MutationPayloadByAction['update_runtime']).serviceId];
    case 'update_security':
      return [(m.payload as MutationPayloadByAction['update_security']).serviceId];
  }
}
