// Strongly typed mutation system. The mutation executor is the ONLY path
// allowed to modify the architecture graph. AI providers must produce
// structured plans of these mutations — they NEVER mutate state directly.

import type {
  Connection,
  Criticality,
  Region,
  Runtime,
  ServiceCategory,
  ServiceNode,
} from './graph';

export type MutationAction =
  | 'add_service'
  | 'remove_service'
  | 'update_service'
  | 'add_connection'
  | 'remove_connection'
  | 'update_connection'
  | 'add_region'
  | 'update_runtime'
  | 'update_security';

export interface AddServicePayload {
  service: Partial<ServiceNode> & { name: string; type: ServiceCategory };
}
export interface RemoveServicePayload {
  id: string;
}
export interface UpdateServicePayload {
  id: string;
  patch: Partial<ServiceNode>;
}
export interface AddConnectionPayload {
  connection: Omit<Connection, 'id'> & { id?: string };
}
export interface RemoveConnectionPayload {
  id: string;
}
export interface UpdateConnectionPayload {
  id: string;
  patch: Partial<Connection>;
}
export interface AddRegionPayload {
  region: Region;
  // Apply a region label to a set of services. If empty, region is recorded
  // on metadata only and no services are mutated.
  applyToServiceIds?: string[];
}
export interface UpdateRuntimePayload {
  serviceId: string;
  runtime: Runtime;
}
export interface UpdateSecurityPayload {
  serviceId: string;
  encryption?: { atRest?: boolean; inTransit?: boolean };
  exposure?: ServiceNode['exposure'];
  criticality?: Criticality;
  observability?: boolean;
}

export type MutationPayloadByAction = {
  add_service: AddServicePayload;
  remove_service: RemoveServicePayload;
  update_service: UpdateServicePayload;
  add_connection: AddConnectionPayload;
  remove_connection: RemoveConnectionPayload;
  update_connection: UpdateConnectionPayload;
  add_region: AddRegionPayload;
  update_runtime: UpdateRuntimePayload;
  update_security: UpdateSecurityPayload;
};

export interface GraphMutation<A extends MutationAction = MutationAction> {
  id: string;
  action: A;
  payload: MutationPayloadByAction[A];
  reason?: string;
  source?: 'user' | 'ai';
  createdAt: string;
}

export interface MutationPlan {
  id: string;
  summary: string;
  rationale?: string;
  mutations: GraphMutation[];
  source: 'user' | 'ai';
  createdAt: string;
  // Optional warnings produced by the planner (deterministic checks).
  warnings?: string[];
}

export interface MutationResult {
  ok: boolean;
  applied: GraphMutation[];
  errors: { mutationId: string; message: string }[];
}
