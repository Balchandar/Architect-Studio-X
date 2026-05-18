// Deterministic graph traversal helpers. AI reasoning lives ON TOP OF these
// queries — never the other way around.

import type { ArchitectureGraph, Connection, ServiceNode } from '@/types/graph';

interface AdjacencyMaps {
  outgoing: Map<string, Connection[]>;
  incoming: Map<string, Connection[]>;
  byId: Map<string, ServiceNode>;
}

export function buildAdjacency(graph: ArchitectureGraph): AdjacencyMaps {
  const outgoing = new Map<string, Connection[]>();
  const incoming = new Map<string, Connection[]>();
  const byId = new Map<string, ServiceNode>();
  for (const s of graph.services) byId.set(s.id, s);
  for (const c of graph.connections) {
    if (!outgoing.has(c.source)) outgoing.set(c.source, []);
    if (!incoming.has(c.target)) incoming.set(c.target, []);
    outgoing.get(c.source)!.push(c);
    incoming.get(c.target)!.push(c);
    if (c.direction === 'bidirectional') {
      if (!outgoing.has(c.target)) outgoing.set(c.target, []);
      if (!incoming.has(c.source)) incoming.set(c.source, []);
      outgoing.get(c.target)!.push(c);
      incoming.get(c.source)!.push(c);
    }
  }
  return { outgoing, incoming, byId };
}

function bfs(
  start: string,
  next: (id: string) => string[],
): { order: string[]; depth: Map<string, number> } {
  const seen = new Set<string>([start]);
  const queue: string[] = [start];
  const order: string[] = [];
  const depth = new Map<string, number>([[start, 0]]);
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const n of next(id)) {
      if (seen.has(n)) continue;
      seen.add(n);
      depth.set(n, (depth.get(id) ?? 0) + 1);
      queue.push(n);
    }
  }
  return { order, depth };
}

export interface DependencyResult {
  rootId: string;
  serviceIds: string[];
  depthById: Record<string, number>;
}

export function downstreamDependencies(
  graph: ArchitectureGraph,
  rootId: string,
): DependencyResult {
  const adj = buildAdjacency(graph);
  if (!adj.byId.has(rootId)) {
    return { rootId, serviceIds: [], depthById: {} };
  }
  const { order, depth } = bfs(rootId, (id) =>
    (adj.outgoing.get(id) ?? []).map((c) =>
      c.source === id ? c.target : c.source,
    ),
  );
  const depthById: Record<string, number> = {};
  depth.forEach((v, k) => (depthById[k] = v));
  return { rootId, serviceIds: order, depthById };
}

export function upstreamDependencies(
  graph: ArchitectureGraph,
  rootId: string,
): DependencyResult {
  const adj = buildAdjacency(graph);
  if (!adj.byId.has(rootId)) {
    return { rootId, serviceIds: [], depthById: {} };
  }
  const { order, depth } = bfs(rootId, (id) =>
    (adj.incoming.get(id) ?? []).map((c) =>
      c.source === id ? c.target : c.source,
    ),
  );
  const depthById: Record<string, number> = {};
  depth.forEach((v, k) => (depthById[k] = v));
  return { rootId, serviceIds: order, depthById };
}

export interface BlastRadius {
  rootId: string;
  // Services that depend (directly or transitively) on rootId.
  affectedIds: string[];
  // The subset that is critical/high.
  criticalAffectedIds: string[];
  description: string;
}

/** What breaks if the given service fails. */
export function blastRadius(
  graph: ArchitectureGraph,
  rootId: string,
): BlastRadius {
  const upstream = upstreamDependencies(graph, rootId);
  const affectedIds = upstream.serviceIds.filter((id) => id !== rootId);
  const criticalAffectedIds = affectedIds.filter((id) => {
    const s = graph.services.find((x) => x.id === id);
    return s && (s.criticality === 'critical' || s.criticality === 'high');
  });
  const root = graph.services.find((s) => s.id === rootId);
  return {
    rootId,
    affectedIds,
    criticalAffectedIds,
    description: root
      ? `If ${root.name} fails, ${affectedIds.length} service(s) lose this dependency` +
        (criticalAffectedIds.length
          ? `, including ${criticalAffectedIds.length} critical/high.`
          : '.')
      : 'unknown service',
  };
}

/**
 * Detect single points of failure: critical/high services with no redundant
 * peer (e.g. only one DB instance, one gateway, etc) that have at least one
 * upstream consumer.
 */
export interface SPOF {
  serviceId: string;
  name: string;
  reason: string;
  consumers: string[];
}
export function detectSPOFs(graph: ArchitectureGraph): SPOF[] {
  const adj = buildAdjacency(graph);
  const out: SPOF[] = [];
  const byTypeAndRegion = new Map<string, ServiceNode[]>();
  for (const s of graph.services) {
    const key = `${s.type}:${s.region}:${s.group ?? ''}`;
    if (!byTypeAndRegion.has(key)) byTypeAndRegion.set(key, []);
    byTypeAndRegion.get(key)!.push(s);
  }
  for (const s of graph.services) {
    const consumers = (adj.incoming.get(s.id) ?? []).map((c) =>
      c.source === s.id ? c.target : c.source,
    );
    if (!consumers.length) continue;
    const isCritical = s.criticality === 'critical' || s.criticality === 'high';
    if (!isCritical) continue;
    const peers = byTypeAndRegion.get(`${s.type}:${s.region}:${s.group ?? ''}`) ?? [];
    if (peers.length <= 1 && s.region !== 'multi-region' && s.region !== 'global') {
      out.push({
        serviceId: s.id,
        name: s.name,
        reason: `Critical ${s.type} with no peer in ${s.region}`,
        consumers,
      });
    }
  }
  return out;
}

/** A direct dependency tree (1 level deep) of a service. */
export function dependencyTree(graph: ArchitectureGraph, rootId: string) {
  const adj = buildAdjacency(graph);
  return {
    upstream: (adj.incoming.get(rootId) ?? []).map((c) => ({
      connection: c,
      service: graph.services.find(
        (s) => s.id === (c.source === rootId ? c.target : c.source),
      ),
    })),
    downstream: (adj.outgoing.get(rootId) ?? []).map((c) => ({
      connection: c,
      service: graph.services.find(
        (s) => s.id === (c.source === rootId ? c.target : c.source),
      ),
    })),
  };
}

export function isPathBetween(
  graph: ArchitectureGraph,
  fromId: string,
  toId: string,
): boolean {
  const adj = buildAdjacency(graph);
  if (!adj.byId.has(fromId) || !adj.byId.has(toId)) return false;
  const seen = new Set<string>([fromId]);
  const stack = [fromId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === toId) return true;
    for (const c of adj.outgoing.get(id) ?? []) {
      const next = c.source === id ? c.target : c.source;
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return false;
}
