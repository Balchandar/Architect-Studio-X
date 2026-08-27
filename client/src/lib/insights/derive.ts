import type { ArchitectureGraph, ServiceNode } from '@/types/graph';
import type { CostEstimate, Insight, InsightsBundle } from '@/types/insights';
import { runValidation } from '@/lib/validation/engine';

const monthlyByType: Record<string, (s: ServiceNode) => { name: string; monthly: number }> = {
  data: (s) => ({ name: `RDS ${s.name}`, monthly: s.criticality === 'critical' ? 2400 : 1400 }),
  compute: (s) => ({
    name: `EC2 / ${s.runtime} ${s.name}`,
    monthly: s.criticality === 'critical' ? 900 : 500,
  }),
  cache: (s) => ({ name: s.name, monthly: 600 }),
  queue: (s) => ({ name: `${s.name} (MSK)`, monthly: 2800 }),
  cdn: (s) => ({ name: 'CloudFront / Edge', monthly: 800 }),
  gateway: (s) => ({ name: `Gateway ${s.name}`, monthly: 350 }),
  observability: (s) => ({ name: s.name, monthly: 250 }),
  security: (s) => ({ name: s.name, monthly: 150 }),
  storage: (s) => ({ name: s.name, monthly: 300 }),
  external: () => ({ name: '', monthly: 0 }),
  client: () => ({ name: '', monthly: 0 }),
};

function estimateCost(graph: ArchitectureGraph): CostEstimate {
  const lineItems: { name: string; monthly: number }[] = [];
  for (const s of graph.services) {
    const fn = monthlyByType[s.type];
    if (!fn) continue;
    const item = fn(s);
    if (item.monthly > 0) lineItems.push(item);
  }
  // include data transfer + misc baseline
  lineItems.push({ name: 'Data Transfer', monthly: 3400 });
  lineItems.push({ name: 'EC2 / EKS', monthly: 3050 });
  lineItems.push({ name: 'Others', monthly: 2000 });

  const aggregated = new Map<string, number>();
  for (const li of lineItems) {
    aggregated.set(li.name, (aggregated.get(li.name) ?? 0) + li.monthly);
  }
  const ranked = [...aggregated.entries()]
    .map(([name, monthly]) => ({ name, monthly }))
    .sort((a, b) => b.monthly - a.monthly);

  // Total must cover every line item; only the displayed contributor list is
  // truncated to the top few.
  const monthlyTotal = ranked.reduce((sum, t) => sum + t.monthly, 0);
  const topContributors = ranked.slice(0, 5);
  return { monthlyTotal, currency: 'USD', topContributors };
}

function tradeoffInsights(graph: ArchitectureGraph): Insight[] {
  const out: Insight[] = [];
  if (graph.services.some((s) => s.type === 'queue' && /kafka/i.test(s.name))) {
    out.push({
      id: 't.kafka',
      category: 'tradeoff',
      severity: 'info',
      title: 'Event-driven decoupling via Kafka',
      detail:
        'Using Kafka improves decoupling and scalability but increases operational complexity.',
      confidence: 'high',
      source: 'static',
    });
  }
  const k8s = graph.services.filter((s) => s.runtime === 'kubernetes').length;
  if (k8s >= 3) {
    out.push({
      id: 't.k8s',
      category: 'tradeoff',
      severity: 'info',
      title: 'Kubernetes platform commitment',
      detail:
        'Standardising on Kubernetes provides portability but requires platform engineering investment.',
      confidence: 'medium',
      source: 'static',
    });
  }
  return out;
}

function suggestionInsights(graph: ArchitectureGraph): Insight[] {
  const out: Insight[] = [];
  const pgUsers = graph.services.find((s) => s.type === 'data' && /users/i.test(s.name));
  if (pgUsers && !graph.services.some((s) => /replica/i.test(s.name))) {
    out.push({
      id: 's.replica',
      category: 'suggestion',
      severity: 'suggestion',
      title: 'Add read replicas for PostgreSQL',
      detail: 'Read replicas improve read scalability and reduce primary load.',
      confidence: 'high',
      affectedNodeIds: [pgUsers.id],
      source: 'static',
    });
  }
  const apiGw = graph.services.find((s) => s.type === 'gateway');
  if (apiGw) {
    out.push({
      id: 's.gateway-cache',
      category: 'suggestion',
      severity: 'suggestion',
      title: 'Consider API Gateway caching for catalog reads',
      detail: 'Cache frequently-read product catalog responses at the edge.',
      confidence: 'medium',
      affectedNodeIds: [apiGw.id],
      source: 'static',
    });
  }
  return out;
}

function adrInsights(graph: ArchitectureGraph): Insight[] {
  return graph.decisions.map<Insight>((d) => ({
    id: `adr.${d.id}`,
    category: 'adr',
    severity: 'info',
    title: d.title,
    detail: `${d.consequences}`,
    source: 'static',
    confidence: 'medium',
  }));
}

export function deriveInsights(graph: ArchitectureGraph): InsightsBundle {
  const validation = runValidation(graph);
  const security = validation.filter((i) => i.category === 'security');
  const reliability = validation.filter((i) => i.category === 'reliability');
  const otherValidation = validation.filter(
    (i) => i.category !== 'security' && i.category !== 'reliability',
  );

  return {
    tradeoffs: tradeoffInsights(graph),
    security,
    reliability,
    suggestions: suggestionInsights(graph),
    validation: otherValidation,
    adr: adrInsights(graph),
    cost: estimateCost(graph),
  };
}
