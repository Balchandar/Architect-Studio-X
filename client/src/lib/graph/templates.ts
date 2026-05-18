// Starter architecture templates. Each template is a fully formed
// ArchitectureGraph that flows through the same setGraph -> layout -> validate
// pipeline as any other graph mutation.

import type { ArchitectureGraph } from '@/types/graph';

const now = () => new Date().toISOString();

export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  domain: string;
  build: () => ArchitectureGraph;
}

function healthcareSaaS(): ArchitectureGraph {
  const t = now();
  return {
    metadata: {
      name: 'Healthcare SaaS',
      description: 'HIPAA-aligned multi-tenant clinical SaaS platform.',
      createdAt: t,
      updatedAt: t,
    },
    services: [
      { id: 'svc_clinicians', type: 'client', name: 'Clinicians', runtime: 'browser', region: 'global', criticality: 'high', tags: ['web'], exposure: 'public', group: 'Clients' },
      { id: 'svc_patients', type: 'client', name: 'Patient Portal', runtime: 'browser', region: 'global', criticality: 'medium', tags: ['web', 'mobile'], exposure: 'public', group: 'Clients' },
      { id: 'svc_waf', type: 'security', name: 'WAF', runtime: 'managed', region: 'global', criticality: 'high', tags: ['security'], exposure: 'public', group: 'Edge' },
      { id: 'svc_gw', type: 'gateway', name: 'API Gateway', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: ['gateway', 'auth'], exposure: 'public', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Edge' },
      { id: 'svc_auth', type: 'compute', name: 'Auth Service', runtime: 'kubernetes', region: 'us-east-1', criticality: 'critical', tags: ['oidc', 'sso'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Application' },
      { id: 'svc_emr', type: 'compute', name: 'EMR Service', runtime: 'kubernetes', region: 'us-east-1', criticality: 'critical', tags: ['phi', 'hipaa'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Application' },
      { id: 'svc_billing', type: 'compute', name: 'Billing Service', runtime: 'kubernetes', region: 'us-east-1', criticality: 'high', tags: ['billing'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Application' },
      { id: 'svc_pg_emr', type: 'data', name: 'PostgreSQL (EMR)', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: ['phi'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Data' },
      { id: 'svc_s3_phi', type: 'storage', name: 'S3 (PHI Documents)', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: ['phi'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, group: 'Data' },
      { id: 'svc_audit', type: 'observability', name: 'Audit Log', runtime: 'managed', region: 'us-east-1', criticality: 'high', tags: ['audit', 'hipaa'], exposure: 'internal', observability: true, group: 'Observability' },
    ],
    connections: [
      { id: 'c1', source: 'svc_clinicians', target: 'svc_waf', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c2', source: 'svc_patients', target: 'svc_waf', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c3', source: 'svc_waf', target: 'svc_gw', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c4', source: 'svc_gw', target: 'svc_auth', protocol: 'https', direction: 'unidirectional', encryption: 'mtls' },
      { id: 'c5', source: 'svc_gw', target: 'svc_emr', protocol: 'https', direction: 'unidirectional', encryption: 'mtls' },
      { id: 'c6', source: 'svc_gw', target: 'svc_billing', protocol: 'https', direction: 'unidirectional', encryption: 'mtls' },
      { id: 'c7', source: 'svc_emr', target: 'svc_pg_emr', protocol: 'sql', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c8', source: 'svc_emr', target: 'svc_s3_phi', protocol: 'https', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c9', source: 'svc_emr', target: 'svc_audit', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
    ],
    constraints: [
      { id: 'k1', kind: 'compliance', label: 'HIPAA' },
      { id: 'k2', kind: 'security', label: 'PHI encrypted at rest and in transit' },
      { id: 'k3', kind: 'reliability', label: '99.9% availability' },
    ],
    decisions: [],
  };
}

function eventDrivenCommerce(): ArchitectureGraph {
  const t = now();
  return {
    metadata: {
      name: 'Event-Driven Commerce',
      description: 'High-throughput commerce with Kafka-driven order/payment flows.',
      createdAt: t,
      updatedAt: t,
    },
    services: [
      { id: 'svc_users', type: 'client', name: 'Shoppers', runtime: 'browser', region: 'global', criticality: 'high', tags: [], exposure: 'public', group: 'Clients' },
      { id: 'svc_cdn', type: 'cdn', name: 'CDN', runtime: 'managed', region: 'global', criticality: 'high', tags: [], exposure: 'public', group: 'Edge' },
      { id: 'svc_gw', type: 'gateway', name: 'API Gateway', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: [], exposure: 'public', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Edge' },
      { id: 'svc_catalog', type: 'compute', name: 'Catalog', runtime: 'kubernetes', region: 'us-east-1', criticality: 'high', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Application' },
      { id: 'svc_cart', type: 'compute', name: 'Cart', runtime: 'kubernetes', region: 'us-east-1', criticality: 'high', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Application' },
      { id: 'svc_order', type: 'compute', name: 'Order', runtime: 'kubernetes', region: 'us-east-1', criticality: 'critical', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Application' },
      { id: 'svc_payment', type: 'compute', name: 'Payment', runtime: 'kubernetes', region: 'us-east-1', criticality: 'critical', tags: ['pci'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Application' },
      { id: 'svc_kafka', type: 'queue', name: 'Kafka', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Data' },
      { id: 'svc_pg', type: 'data', name: 'PostgreSQL', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Data' },
      { id: 'svc_redis', type: 'cache', name: 'Redis', runtime: 'managed', region: 'us-east-1', criticality: 'high', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, group: 'Data' },
    ],
    connections: [
      { id: 'c1', source: 'svc_users', target: 'svc_cdn', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c2', source: 'svc_cdn', target: 'svc_gw', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c3', source: 'svc_gw', target: 'svc_catalog', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c4', source: 'svc_gw', target: 'svc_cart', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c5', source: 'svc_gw', target: 'svc_order', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c6', source: 'svc_cart', target: 'svc_redis', protocol: 'tcp', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c7', source: 'svc_order', target: 'svc_kafka', protocol: 'kafka', direction: 'unidirectional', encryption: 'tls', async: true, label: 'order.created' },
      { id: 'c8', source: 'svc_kafka', target: 'svc_payment', protocol: 'kafka', direction: 'unidirectional', encryption: 'tls', async: true, label: 'order.created' },
      { id: 'c9', source: 'svc_order', target: 'svc_pg', protocol: 'sql', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c10', source: 'svc_payment', target: 'svc_pg', protocol: 'sql', direction: 'bidirectional', encryption: 'tls' },
    ],
    constraints: [
      { id: 'k1', kind: 'reliability', label: 'Async order processing' },
      { id: 'k2', kind: 'compliance', label: 'PCI DSS' },
    ],
    decisions: [],
  };
}

function internalDeveloperPlatform(): ArchitectureGraph {
  const t = now();
  return {
    metadata: { name: 'Internal Developer Platform', description: 'Self-service IDP with golden paths.', createdAt: t, updatedAt: t },
    services: [
      { id: 'svc_devs', type: 'client', name: 'Developers', runtime: 'browser', region: 'global', criticality: 'high', tags: [], exposure: 'internal', group: 'Clients' },
      { id: 'svc_portal', type: 'compute', name: 'Developer Portal', runtime: 'kubernetes', region: 'us-east-1', criticality: 'high', tags: ['backstage'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Platform' },
      { id: 'svc_ci', type: 'compute', name: 'CI Runner', runtime: 'kubernetes', region: 'us-east-1', criticality: 'high', tags: ['ci'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Platform' },
      { id: 'svc_registry', type: 'storage', name: 'Container Registry', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, group: 'Platform' },
      { id: 'svc_secrets', type: 'security', name: 'Secrets Manager', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, group: 'Platform' },
      { id: 'svc_argo', type: 'compute', name: 'ArgoCD', runtime: 'kubernetes', region: 'us-east-1', criticality: 'critical', tags: ['gitops'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Platform' },
      { id: 'svc_obs', type: 'observability', name: 'Observability Stack', runtime: 'kubernetes', region: 'us-east-1', criticality: 'medium', tags: [], exposure: 'internal', observability: true, group: 'Observability' },
    ],
    connections: [
      { id: 'c1', source: 'svc_devs', target: 'svc_portal', protocol: 'https', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c2', source: 'svc_portal', target: 'svc_ci', protocol: 'https', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c3', source: 'svc_ci', target: 'svc_registry', protocol: 'https', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c4', source: 'svc_ci', target: 'svc_secrets', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c5', source: 'svc_argo', target: 'svc_registry', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c6', source: 'svc_argo', target: 'svc_obs', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
    ],
    constraints: [{ id: 'k1', kind: 'team', label: 'Self-service deploys' }],
    decisions: [],
  };
}

function multiRegionFintech(): ArchitectureGraph {
  const t = now();
  return {
    metadata: { name: 'Multi-Region Fintech', description: 'Active-active fintech with strong compliance posture.', createdAt: t, updatedAt: t },
    services: [
      { id: 'svc_clients', type: 'client', name: 'Clients', runtime: 'browser', region: 'global', criticality: 'high', tags: [], exposure: 'public', group: 'Clients' },
      { id: 'svc_cdn', type: 'cdn', name: 'CDN', runtime: 'managed', region: 'global', criticality: 'high', tags: [], exposure: 'public', group: 'Edge' },
      { id: 'svc_gw_us', type: 'gateway', name: 'Gateway (US)', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: [], exposure: 'public', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Edge' },
      { id: 'svc_gw_eu', type: 'gateway', name: 'Gateway (EU)', runtime: 'managed', region: 'eu-west-1', criticality: 'critical', tags: [], exposure: 'public', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Edge' },
      { id: 'svc_ledger_us', type: 'compute', name: 'Ledger (US)', runtime: 'kubernetes', region: 'us-east-1', criticality: 'critical', tags: ['pci', 'sox'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Application' },
      { id: 'svc_ledger_eu', type: 'compute', name: 'Ledger (EU)', runtime: 'kubernetes', region: 'eu-west-1', criticality: 'critical', tags: ['pci', 'sox'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Application' },
      { id: 'svc_pg_us', type: 'data', name: 'PostgreSQL (US)', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Data' },
      { id: 'svc_pg_eu', type: 'data', name: 'PostgreSQL (EU)', runtime: 'managed', region: 'eu-west-1', criticality: 'critical', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Data' },
      { id: 'svc_kafka', type: 'queue', name: 'Kafka (Cross-region)', runtime: 'managed', region: 'multi-region', criticality: 'critical', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Data' },
    ],
    connections: [
      { id: 'c1', source: 'svc_clients', target: 'svc_cdn', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c2', source: 'svc_cdn', target: 'svc_gw_us', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c3', source: 'svc_cdn', target: 'svc_gw_eu', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c4', source: 'svc_gw_us', target: 'svc_ledger_us', protocol: 'https', direction: 'unidirectional', encryption: 'mtls' },
      { id: 'c5', source: 'svc_gw_eu', target: 'svc_ledger_eu', protocol: 'https', direction: 'unidirectional', encryption: 'mtls' },
      { id: 'c6', source: 'svc_ledger_us', target: 'svc_pg_us', protocol: 'sql', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c7', source: 'svc_ledger_eu', target: 'svc_pg_eu', protocol: 'sql', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c8', source: 'svc_ledger_us', target: 'svc_kafka', protocol: 'kafka', direction: 'bidirectional', encryption: 'tls', async: true },
      { id: 'c9', source: 'svc_ledger_eu', target: 'svc_kafka', protocol: 'kafka', direction: 'bidirectional', encryption: 'tls', async: true },
    ],
    constraints: [
      { id: 'k1', kind: 'reliability', label: 'Active-active multi-region' },
      { id: 'k2', kind: 'compliance', label: 'PCI DSS, SOX' },
    ],
    decisions: [],
  };
}

function aiInferencePlatform(): ArchitectureGraph {
  const t = now();
  return {
    metadata: { name: 'AI Inference Platform', description: 'GPU-backed inference platform with model registry and batch jobs.', createdAt: t, updatedAt: t },
    services: [
      { id: 'svc_apps', type: 'client', name: 'Customer Apps', runtime: 'browser', region: 'global', criticality: 'high', tags: [], exposure: 'public', group: 'Clients' },
      { id: 'svc_gw', type: 'gateway', name: 'API Gateway', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: [], exposure: 'public', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Edge' },
      { id: 'svc_router', type: 'compute', name: 'Inference Router', runtime: 'kubernetes', region: 'us-east-1', criticality: 'critical', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Application' },
      { id: 'svc_gpu_a', type: 'compute', name: 'GPU Pool A (vLLM)', runtime: 'kubernetes', region: 'us-east-1', criticality: 'critical', tags: ['gpu'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Inference' },
      { id: 'svc_gpu_b', type: 'compute', name: 'GPU Pool B (vLLM)', runtime: 'kubernetes', region: 'us-west-2', criticality: 'critical', tags: ['gpu'], exposure: 'internal', encryption: { atRest: true, inTransit: true }, observability: true, group: 'Inference' },
      { id: 'svc_registry', type: 'storage', name: 'Model Registry', runtime: 'managed', region: 'us-east-1', criticality: 'critical', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, group: 'Data' },
      { id: 'svc_cache', type: 'cache', name: 'Embedding Cache', runtime: 'managed', region: 'us-east-1', criticality: 'high', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, group: 'Data' },
      { id: 'svc_q', type: 'queue', name: 'Batch Job Queue', runtime: 'managed', region: 'us-east-1', criticality: 'medium', tags: [], exposure: 'internal', encryption: { atRest: true, inTransit: true }, group: 'Data' },
    ],
    connections: [
      { id: 'c1', source: 'svc_apps', target: 'svc_gw', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c2', source: 'svc_gw', target: 'svc_router', protocol: 'https', direction: 'unidirectional', encryption: 'mtls' },
      { id: 'c3', source: 'svc_router', target: 'svc_gpu_a', protocol: 'grpc', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c4', source: 'svc_router', target: 'svc_gpu_b', protocol: 'grpc', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c5', source: 'svc_router', target: 'svc_cache', protocol: 'tcp', direction: 'bidirectional', encryption: 'tls' },
      { id: 'c6', source: 'svc_gpu_a', target: 'svc_registry', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c7', source: 'svc_gpu_b', target: 'svc_registry', protocol: 'https', direction: 'unidirectional', encryption: 'tls' },
      { id: 'c8', source: 'svc_router', target: 'svc_q', protocol: 'amqp', direction: 'unidirectional', encryption: 'tls', async: true },
    ],
    constraints: [
      { id: 'k1', kind: 'cost', label: 'GPU autoscaling required' },
      { id: 'k2', kind: 'performance', label: 'p95 latency < 800ms' },
    ],
    decisions: [],
  };
}

export const architectureTemplates: ArchitectureTemplate[] = [
  { id: 'tpl_healthcare', name: 'Healthcare SaaS', description: 'HIPAA-aligned multi-tenant clinical SaaS.', domain: 'Healthcare', build: healthcareSaaS },
  { id: 'tpl_commerce', name: 'Event-Driven Commerce', description: 'Kafka-driven commerce with async order processing.', domain: 'Commerce', build: eventDrivenCommerce },
  { id: 'tpl_idp', name: 'Internal Developer Platform', description: 'Backstage + ArgoCD self-service platform.', domain: 'Platform', build: internalDeveloperPlatform },
  { id: 'tpl_fintech', name: 'Multi-Region Fintech', description: 'Active-active US/EU fintech with PCI/SOX.', domain: 'Fintech', build: multiRegionFintech },
  { id: 'tpl_ai', name: 'AI Inference Platform', description: 'GPU-pooled inference platform with batch jobs.', domain: 'AI/ML', build: aiInferencePlatform },
];

export function getTemplate(id: string): ArchitectureTemplate | undefined {
  return architectureTemplates.find((t) => t.id === id);
}
