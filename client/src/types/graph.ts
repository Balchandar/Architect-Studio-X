// Semantic Architecture Graph — the source of truth.
// React Flow nodes/edges are derived projections of this state.

export type ServiceCategory =
  | 'compute'
  | 'data'
  | 'gateway'
  | 'cache'
  | 'queue'
  | 'cdn'
  | 'security'
  | 'observability'
  | 'external'
  | 'client'
  | 'storage';

export type Runtime =
  | 'kubernetes'
  | 'lambda'
  | 'ec2'
  | 'fargate'
  | 'managed'
  | 'browser'
  | 'mobile'
  | 'on-prem'
  | 'unknown';

export type Region =
  | 'us-east-1'
  | 'us-west-2'
  | 'eu-west-1'
  | 'eu-central-1'
  | 'ap-southeast-1'
  | 'global'
  | 'multi-region';

export type Criticality = 'low' | 'medium' | 'high' | 'critical';

export type Protocol =
  | 'http'
  | 'https'
  | 'grpc'
  | 'tcp'
  | 'udp'
  | 'amqp'
  | 'kafka'
  | 'sql'
  | 'mqtt'
  | 'graphql'
  | 'mtls';

export interface ServiceNode {
  id: string;
  type: ServiceCategory;
  name: string;
  description?: string;
  runtime: Runtime;
  region: Region;
  criticality: Criticality;
  tags: string[];
  exposure?: 'internal' | 'public' | 'partner';
  encryption?: { atRest: boolean; inTransit: boolean };
  observability?: boolean;
  position?: { x: number; y: number };
  group?: string; // logical grouping (e.g. "Application Services")
}

export interface Connection {
  id: string;
  source: string;
  target: string;
  protocol: Protocol;
  direction: 'unidirectional' | 'bidirectional';
  encryption: 'none' | 'tls' | 'mtls';
  label?: string;
  async?: boolean;
}

export interface Constraint {
  id: string;
  kind: 'compliance' | 'reliability' | 'cost' | 'performance' | 'security' | 'team' | 'stack';
  label: string;
  description?: string;
}

export type ADRStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';

export interface ADR {
  id: string;
  title: string;
  status: ADRStatus;
  context: string;
  decision: string;
  consequences: string;
  createdAt: string;
}

export interface GraphMetadata {
  name: string;
  description?: string;
  updatedAt: string;
  createdAt: string;
  /** Regions this architecture declares it spans. Populated by add_region
   *  (including when no specific services are relabeled). */
  regions?: Region[];
}

export interface ArchitectureGraph {
  services: ServiceNode[];
  connections: Connection[];
  constraints: Constraint[];
  decisions: ADR[];
  metadata: GraphMetadata;
}

export type GraphPatchOp =
  | { op: 'add-service'; service: ServiceNode }
  | { op: 'remove-service'; id: string }
  | { op: 'update-service'; id: string; patch: Partial<ServiceNode> }
  | { op: 'add-connection'; connection: Connection }
  | { op: 'remove-connection'; id: string }
  | { op: 'update-connection'; id: string; patch: Partial<Connection> };

export interface SemanticDiffEntry {
  kind:
    | 'service-added'
    | 'service-removed'
    | 'service-modified'
    | 'connection-added'
    | 'connection-removed'
    | 'connection-modified'
    | 'metadata-changed';
  id?: string;
  label: string;
  detail?: string;
}
