import type { ArchitectureGraph } from '@/types/graph';

export function emptyGraph(name = 'Test'): ArchitectureGraph {
  return {
    services: [],
    connections: [],
    constraints: [],
    decisions: [],
    metadata: {
      name,
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  };
}

export function sampleGraph(): ArchitectureGraph {
  return {
    services: [
      {
        id: 'api',
        type: 'gateway',
        name: 'API Gateway',
        runtime: 'managed',
        region: 'us-east-1',
        criticality: 'high',
        tags: ['public-facing'],
        exposure: 'public',
        encryption: { atRest: true, inTransit: true },
      },
      {
        id: 'svc',
        type: 'compute',
        name: 'Orders Service',
        runtime: 'kubernetes',
        region: 'us-east-1',
        criticality: 'high',
        tags: [],
        exposure: 'internal',
        encryption: { atRest: true, inTransit: true },
      },
      {
        id: 'db',
        type: 'data',
        name: 'Orders DB',
        runtime: 'managed',
        region: 'us-east-1',
        criticality: 'critical',
        tags: [],
        exposure: 'internal',
        encryption: { atRest: true, inTransit: true },
      },
    ],
    connections: [
      {
        id: 'c1',
        source: 'api',
        target: 'svc',
        protocol: 'https',
        direction: 'unidirectional',
        encryption: 'tls',
      },
      {
        id: 'c2',
        source: 'svc',
        target: 'db',
        protocol: 'sql',
        direction: 'unidirectional',
        encryption: 'tls',
      },
    ],
    constraints: [],
    decisions: [],
    metadata: {
      name: 'Sample',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  };
}
