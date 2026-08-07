// Semantic diff engine. Detects meaningful architecture changes — not raw
// JSON deltas. The output drives the diff viewer, the AI summarizer, and the
// version-history UI.

import type {
  ArchitectureGraph,
  Connection,
  SemanticDiffEntry,
  ServiceNode,
} from '@/types/graph';

function indexById<T extends { id: string }>(arr: T[]): Map<string, T> {
  return new Map(arr.map((x) => [x.id, x]));
}

const SEMANTIC_SERVICE_FIELDS: (keyof ServiceNode)[] = [
  'name',
  'type',
  'runtime',
  'region',
  'criticality',
  'exposure',
  'observability',
  'group',
];

function describeServiceFieldChange(
  field: keyof ServiceNode,
  before: ServiceNode,
  after: ServiceNode,
): string | null {
  const b = (before as any)[field];
  const a = (after as any)[field];
  if (JSON.stringify(b) === JSON.stringify(a)) return null;
  switch (field) {
    case 'runtime':
      return `runtime changed: ${b} → ${a}`;
    case 'region':
      return `region moved: ${b} → ${a}`;
    case 'criticality':
      return `criticality: ${b} → ${a}`;
    case 'exposure':
      return `exposure: ${b} → ${a}`;
    case 'observability':
      return a ? 'observability enabled' : 'observability removed';
    case 'name':
      return `renamed: "${b}" → "${a}"`;
    case 'type':
      return `category changed: ${b} → ${a}`;
    case 'group':
      return `regrouped: ${b ?? '—'} → ${a ?? '—'}`;
    default:
      return `${String(field)} changed`;
  }
}

function describeEncryptionChange(
  before: ServiceNode,
  after: ServiceNode,
): string | null {
  const b = before.encryption;
  const a = after.encryption;
  if (JSON.stringify(b) === JSON.stringify(a)) return null;
  if (!b && a) return 'encryption added';
  if (b && !a) return 'encryption removed';
  const flips: string[] = [];
  if (b!.atRest !== a!.atRest) {
    flips.push(`at-rest ${a!.atRest ? 'on' : 'off'}`);
  }
  if (b!.inTransit !== a!.inTransit) {
    flips.push(`in-transit ${a!.inTransit ? 'on' : 'off'}`);
  }
  return flips.length ? `encryption ${flips.join(', ')}` : null;
}

function describeTagDiff(before: ServiceNode, after: ServiceNode): string | null {
  const bs = new Set(before.tags ?? []);
  const as_ = new Set(after.tags ?? []);
  const added: string[] = [];
  const removed: string[] = [];
  as_.forEach((t) => !bs.has(t) && added.push(t));
  bs.forEach((t) => !as_.has(t) && removed.push(t));
  if (!added.length && !removed.length) return null;
  const parts: string[] = [];
  if (added.length) parts.push(`+tags: ${added.join(', ')}`);
  if (removed.length) parts.push(`-tags: ${removed.join(', ')}`);
  return parts.join('; ');
}

function describeConnectionChange(
  before: Connection,
  after: Connection,
): string | null {
  const parts: string[] = [];
  if (before.protocol !== after.protocol) {
    parts.push(`protocol ${before.protocol} → ${after.protocol}`);
  }
  if (before.encryption !== after.encryption) {
    parts.push(`encryption ${before.encryption} → ${after.encryption}`);
  }
  if (before.direction !== after.direction) {
    parts.push(`direction ${before.direction} → ${after.direction}`);
  }
  if (Boolean(before.async) !== Boolean(after.async)) {
    parts.push(after.async ? 'now async' : 'now sync');
  }
  if (before.label !== after.label) {
    parts.push(`label "${before.label ?? ''}" → "${after.label ?? ''}"`);
  }
  return parts.length ? parts.join('; ') : null;
}

export function diffGraphs(
  before: ArchitectureGraph | null,
  after: ArchitectureGraph,
): SemanticDiffEntry[] {
  const out: SemanticDiffEntry[] = [];
  if (!before) {
    for (const s of after.services) {
      out.push({
        kind: 'service-added',
        id: s.id,
        label: `Added ${s.type}`,
        detail: s.name,
      });
    }
    for (const c of after.connections) {
      out.push({
        kind: 'connection-added',
        id: c.id,
        label: 'Added connection',
        detail: `${c.source} → ${c.target} (${c.protocol})`,
      });
    }
    return out;
  }

  const beforeS = indexById(before.services);
  const afterS = indexById(after.services);
  const beforeC = indexById(before.connections);
  const afterC = indexById(after.connections);

  // Topology changes — service-level.
  for (const [id, s] of afterS) {
    const b = beforeS.get(id);
    if (!b) {
      out.push({
        kind: 'service-added',
        id,
        label: `Added ${s.type}`,
        detail: `${s.name} in ${s.region}`,
      });
      continue;
    }
    const fragments: string[] = [];
    for (const f of SEMANTIC_SERVICE_FIELDS) {
      const change = describeServiceFieldChange(f, b, s);
      if (change) fragments.push(change);
    }
    const enc = describeEncryptionChange(b, s);
    if (enc) fragments.push(enc);
    const tags = describeTagDiff(b, s);
    if (tags) fragments.push(tags);
    if (fragments.length) {
      out.push({
        kind: 'service-modified',
        id,
        label: `Modified ${s.name}`,
        detail: fragments.join(' · '),
      });
    }
  }
  for (const [id, s] of beforeS) {
    if (!afterS.has(id)) {
      out.push({
        kind: 'service-removed',
        id,
        label: `Removed ${s.type}`,
        detail: s.name,
      });
    }
  }

  // Connection-level changes.
  for (const [id, c] of afterC) {
    const b = beforeC.get(id);
    if (!b) {
      out.push({
        kind: 'connection-added',
        id,
        label: 'Added connection',
        detail: `${c.source} → ${c.target} (${c.protocol})`,
      });
      continue;
    }
    const change = describeConnectionChange(b, c);
    if (change) {
      out.push({
        kind: 'connection-modified',
        id,
        label: 'Modified connection',
        detail: `${c.source} → ${c.target}: ${change}`,
      });
    }
  }
  for (const [id, c] of beforeC) {
    if (!afterC.has(id)) {
      out.push({
        kind: 'connection-removed',
        id,
        label: 'Removed connection',
        detail: `${c.source} → ${c.target}`,
      });
    }
  }

  const beforeRegions = [...(before.metadata.regions ?? [])].sort().join(',');
  const afterRegions = [...(after.metadata.regions ?? [])].sort().join(',');
  if (
    before.metadata.name !== after.metadata.name ||
    before.metadata.description !== after.metadata.description ||
    beforeRegions !== afterRegions
  ) {
    out.push({
      kind: 'metadata-changed',
      label: 'Metadata changed',
      detail:
        beforeRegions !== afterRegions
          ? `regions: ${afterRegions || '—'}`
          : after.metadata.name,
    });
  }
  return out;
}

/** Group diff entries into topology vs property changes for UI rendering. */
export function summarizeDiff(entries: SemanticDiffEntry[]) {
  const topology = entries.filter(
    (e) =>
      e.kind === 'service-added' ||
      e.kind === 'service-removed' ||
      e.kind === 'connection-added' ||
      e.kind === 'connection-removed',
  );
  const properties = entries.filter(
    (e) => e.kind === 'service-modified' || e.kind === 'connection-modified',
  );
  const meta = entries.filter((e) => e.kind === 'metadata-changed');
  return { topology, properties, meta };
}

export type DiffTheme =
  | 'security-improved'
  | 'security-regressed'
  | 'resiliency-improved'
  | 'observability-improved'
  | 'cost-increased'
  | 'topology-change';

const SECURITY_KEYWORDS = /tls|mtls|encrypt|in-transit|at-rest/i;
const RESILIENCY_KEYWORDS = /region|multi-region|replica|backup|failover/i;
const OBSERVABILITY_KEYWORDS = /observ|metric|log|trace/i;

/** Heuristic theme tag for a diff entry. Deterministic, no LLM. */
export function diffTheme(
  before: ArchitectureGraph | null,
  after: ArchitectureGraph,
  entry: SemanticDiffEntry,
): DiffTheme | null {
  const detail = (entry.detail ?? '').toLowerCase();
  if (entry.kind === 'service-added') {
    const svc = after.services.find((s) => s.id === entry.id);
    if (!svc) return 'topology-change';
    if (svc.type === 'observability') return 'observability-improved';
    if (svc.type === 'security') return 'security-improved';
    return 'cost-increased';
  }
  if (entry.kind === 'service-removed') return 'topology-change';
  if (entry.kind === 'connection-added') {
    const conn = after.connections.find((c) => c.id === entry.id);
    if (conn?.encryption === 'mtls' || conn?.encryption === 'tls') return 'security-improved';
    if (conn?.encryption === 'none') return 'security-regressed';
    return 'topology-change';
  }
  if (entry.kind === 'connection-modified') {
    if (/encryption tls|encryption mtls/i.test(detail)) return 'security-improved';
    if (/encryption none/i.test(detail)) return 'security-regressed';
    return 'topology-change';
  }
  if (entry.kind === 'service-modified') {
    if (SECURITY_KEYWORDS.test(detail)) return 'security-improved';
    if (RESILIENCY_KEYWORDS.test(detail)) return 'resiliency-improved';
    if (OBSERVABILITY_KEYWORDS.test(detail)) return 'observability-improved';
    return 'topology-change';
  }
  return null;
}

/** Bucket diff entries by the service they primarily affect. */
export function groupDiffByService(
  before: ArchitectureGraph | null,
  after: ArchitectureGraph,
  entries: SemanticDiffEntry[],
): {
  serviceId: string;
  serviceName: string;
  entries: { entry: SemanticDiffEntry; theme: DiffTheme | null }[];
}[] {
  const buckets = new Map<
    string,
    { entry: SemanticDiffEntry; theme: DiffTheme | null }[]
  >();
  const byId = new Map(after.services.map((s) => [s.id, s.name]));
  if (before) for (const s of before.services) if (!byId.has(s.id)) byId.set(s.id, s.name);

  const push = (key: string, entry: SemanticDiffEntry) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push({ entry, theme: diffTheme(before, after, entry) });
  };

  for (const e of entries) {
    if (e.kind.startsWith('service') && e.id) {
      push(e.id, e);
      continue;
    }
    if (e.kind.startsWith('connection') && e.id) {
      const conn =
        after.connections.find((c) => c.id === e.id) ??
        before?.connections.find((c) => c.id === e.id);
      if (conn) {
        push(conn.source, e);
        continue;
      }
    }
    push('__global__', e);
  }
  return [...buckets.entries()].map(([serviceId, list]) => ({
    serviceId,
    serviceName: serviceId === '__global__' ? 'Architecture-wide' : byId.get(serviceId) ?? serviceId,
    entries: list,
  }));
}
