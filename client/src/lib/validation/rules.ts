import type { ArchitectureGraph, ServiceNode } from '@/types/graph';
import type { Insight } from '@/types/insights';

type Rule = (graph: ArchitectureGraph) => Insight[];

const dataTypes = new Set(['data', 'storage', 'cache']);

function nameOf(graph: ArchitectureGraph, id: string): string {
  return graph.services.find((s) => s.id === id)?.name ?? id;
}

const rule_publicDatabaseExposure: Rule = (graph) => {
  return graph.services
    .filter((s) => dataTypes.has(s.type) && s.exposure === 'public')
    .map<Insight>((s) => ({
      id: `r.public-db.${s.id}`,
      category: 'security',
      severity: 'critical',
      title: `${s.name} is reachable from the public internet`,
      detail:
        `Place ${s.name} behind a private subnet, gateway, or service mesh — datastores must never be directly internet-exposed.`,
      affectedNodeIds: [s.id],
      source: 'validation',
    }));
};

const rule_unencryptedInTransit: Rule = (graph) => {
  const insights: Insight[] = [];
  for (const c of graph.connections) {
    if (c.encryption === 'none') {
      const sourceName = nameOf(graph, c.source);
      const targetName = nameOf(graph, c.target);
      insights.push({
        id: `r.no-tls.${c.id}`,
        category: 'security',
        severity: 'critical',
        title: `${sourceName} → ${targetName} is in plaintext`,
        detail:
          `The ${c.protocol} link from ${sourceName} to ${targetName} runs without TLS. Enable TLS (or mTLS for peer identity) before promoting this path.`,
        affectedNodeIds: [c.source, c.target],
        source: 'validation',
      });
    }
  }
  return insights;
};

const rule_paymentMtls: Rule = (graph) => {
  const insights: Insight[] = [];
  const payments = graph.services.filter((s) =>
    s.tags.some((t) => /pay|pci/i.test(t)) || /payment/i.test(s.name),
  );
  for (const p of payments) {
    const externalLinks = graph.connections.filter(
      (c) => c.source === p.id || c.target === p.id,
    );
    for (const link of externalLinks) {
      const other = graph.services.find(
        (s) => s.id === (link.source === p.id ? link.target : link.source),
      );
      if (other?.type === 'external' && link.encryption !== 'mtls') {
        insights.push({
          id: `r.payment-mtls.${link.id}`,
          category: 'security',
          severity: 'warning',
          title: `${p.name} ↔ ${other.name} should use mTLS`,
          detail:
            `Payment integrations with ${other.name} are out-of-network and must verify peer identity. Upgrade the connection from ${link.encryption} to mTLS.`,
          affectedNodeIds: [p.id, other.id],
          source: 'validation',
        });
      }
    }
  }
  return insights;
};

const rule_missingEncryptionAtRest: Rule = (graph) => {
  return graph.services
    .filter(
      (s) =>
        dataTypes.has(s.type) &&
        s.encryption?.atRest === false,
    )
    .map<Insight>((s) => ({
      id: `r.no-rest.${s.id}`,
      category: 'security',
      severity: 'warning',
      title: `${s.name} is unencrypted at rest`,
      detail:
        `Enable disk/storage encryption on ${s.name} (e.g. KMS-managed volumes or platform-level at-rest encryption) to protect data if storage is exfiltrated.`,
      affectedNodeIds: [s.id],
      source: 'validation',
    }));
};

const rule_singleRegion: Rule = (graph) => {
  const inScope = graph.services.filter(
    (s) => s.type !== 'client' && s.type !== 'cdn' && s.type !== 'external',
  );
  if (inScope.length === 0) return [];
  const regions = new Set(inScope.map((s) => s.region));
  if (regions.size <= 1 && !regions.has('multi-region')) {
    const region = [...regions][0] ?? 'us-east-1';
    return [
      {
        id: 'r.single-region',
        category: 'reliability',
        severity: 'warning',
        title: `Single-region deployment (${region})`,
        detail:
          `All compute and data services run in ${region}. A region-wide outage would take the whole platform offline. Consider an active-passive failover region or multi-region active-active.`,
        source: 'validation',
      },
    ];
  }
  return [];
};

const rule_missingObservability: Rule = (graph) => {
  const hasCompute = graph.services.some(
    (s) => s.type === 'compute' || s.type === 'data',
  );
  if (!hasCompute) return [];
  const hasObs = graph.services.some((s) => s.type === 'observability');
  if (!hasObs) {
    return [
      {
        id: 'r.missing-obs',
        category: 'reliability',
        severity: 'warning',
        title: 'No observability stack defined',
        detail:
          'Production behavior cannot be diagnosed without metrics, logs, and tracing. Add at least one observability service (e.g. Prometheus + Grafana + ELK) and wire critical compute to it.',
        source: 'validation',
      },
    ];
  }
  return [];
};

const rule_databaseSpof: Rule = (graph) => {
  const insights: Insight[] = [];
  const byKey = new Map<string, ServiceNode[]>();
  for (const s of graph.services) {
    if (!dataTypes.has(s.type)) continue;
    const key = `${s.type}:${s.region}:${s.tags.slice().sort().join(',')}`;
    byKey.set(key, [...(byKey.get(key) ?? []), s]);
  }
  for (const [, nodes] of byKey) {
    const node = nodes[0];
    if (
      nodes.length === 1 &&
      (node.criticality === 'high' || node.criticality === 'critical')
    ) {
      insights.push({
        id: `r.spof.${node.id}`,
        category: 'reliability',
        severity: 'suggestion',
        title: `${node.name} is a single point of failure`,
        detail:
          `${node.name} (${node.criticality}) has no replica or HA peer in ${node.region}. Add a read replica, multi-AZ deployment, or cross-region copy to remove the SPOF.`,
        affectedNodeIds: [node.id],
        source: 'validation',
      });
    }
  }
  return insights;
};

const rule_internetFacingInternal: Rule = (graph) => {
  return graph.services
    .filter(
      (s) =>
        (s.type === 'compute' || s.type === 'data') &&
        s.exposure === 'public' &&
        !s.tags.includes('public-facing'),
    )
    .map<Insight>((s) => ({
      id: `r.iface.${s.id}`,
      category: 'security',
      severity: 'warning',
      title: `${s.name} is exposed publicly without an edge layer`,
      detail:
        `${s.name} is marked exposure=public but is a ${s.type} service. Place it behind an API gateway, load balancer, or private network unless it is genuinely internet-facing (in which case tag it "public-facing").`,
      affectedNodeIds: [s.id],
      source: 'validation',
    }));
};

const rule_missingBackup: Rule = (graph) => {
  const dbs = graph.services.filter((s) => s.type === 'data');
  const hasBackup = graph.services.some(
    (s) =>
      s.type === 'storage' &&
      s.tags.some((t) => /backup|archive|dr/i.test(t)),
  );
  if (dbs.length > 0 && !hasBackup) {
    return [
      {
        id: 'r.no-backup',
        category: 'reliability',
        severity: 'suggestion',
        title: 'No backup target detected for databases',
        detail:
          `Databases (${dbs.map((d) => d.name).join(', ')}) have no companion backup/archival storage. Add an S3-style target with lifecycle rules and cross-region replication, or document the backup story explicitly.`,
        source: 'validation',
      },
    ];
  }
  return [];
};

const rule_wafBeforeApi: Rule = (graph) => {
  const apiGw = graph.services.find((s) => s.type === 'gateway');
  const waf = graph.services.find((s) => s.type === 'security' && /waf/i.test(s.name));
  if (apiGw && !waf) {
    return [
      {
        id: 'r.no-waf',
        category: 'security',
        severity: 'suggestion',
        title: `No WAF in front of ${apiGw.name}`,
        detail:
          `${apiGw.name} accepts public traffic without a web application firewall. Add a WAF (e.g. CloudFront/Cloudflare/AWS WAF) ahead of the gateway to mitigate L7 attacks like SQLi, XSS, and credential stuffing.`,
        affectedNodeIds: [apiGw.id],
        source: 'validation',
      },
    ];
  }
  return [];
};

export const validationRules: Rule[] = [
  rule_publicDatabaseExposure,
  rule_unencryptedInTransit,
  rule_paymentMtls,
  rule_missingEncryptionAtRest,
  rule_singleRegion,
  rule_missingObservability,
  rule_databaseSpof,
  rule_internetFacingInternal,
  rule_missingBackup,
  rule_wafBeforeApi,
];
