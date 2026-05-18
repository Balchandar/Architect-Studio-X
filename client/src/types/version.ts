import type { ArchitectureGraph } from './graph';

export interface ArchitectureVersion {
  id: string;
  label: string;
  message: string;
  author: string;
  createdAt: string;
  graph: ArchitectureGraph;
  // Plan that produced this version (optional — manual snapshots have none).
  planId?: string;
}

export type ArchitectureEventKind =
  | 'version.saved'
  | 'version.restored'
  | 'graph.generated'
  | 'graph.validated'
  | 'graph.template_loaded'
  | 'service.added'
  | 'service.removed'
  | 'service.updated'
  | 'connection.added'
  | 'connection.removed'
  | 'mutation.applied'
  | 'plan.proposed'
  | 'plan.approved'
  | 'plan.rejected'
  | 'ai.suggestion';

export type EventActor = 'user' | 'ai' | 'system';

export interface ArchitectureEvent {
  id: string;
  kind: ArchitectureEventKind;
  message: string;
  at: string;
  actor?: EventActor;
  meta?: Record<string, unknown>;
}
