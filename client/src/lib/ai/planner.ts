// Structured prompt construction + parsing for the AI planner. Keeps AI
// providers focused on producing strict mutation plans — never freeform UI
// state, never React Flow nodes, never giant essays.

import type { ArchitectureGraph } from '@/types/graph';
import type { IntentState } from '@/types/intent';
import type {
  GraphMutation,
  MutationAction,
  MutationPlan,
  MutationPayloadByAction,
} from '@/types/mutations';
import { createMutation, createPlan } from '@/lib/graph/mutations';

const ALLOWED_ACTIONS: MutationAction[] = [
  'add_service',
  'remove_service',
  'update_service',
  'add_connection',
  'remove_connection',
  'update_connection',
  'add_region',
  'update_runtime',
  'update_security',
];

export interface PlannerInput {
  intent: IntentState;
  graph: ArchitectureGraph;
  prompt: string;
}

export interface RawMutation {
  action: string;
  payload: unknown;
  reason?: string;
}
export interface RawPlan {
  summary?: string;
  rationale?: string;
  mutations?: RawMutation[];
  warnings?: string[];
}

export const PLANNER_SYSTEM_PROMPT = `You are the Architect Studio X planner.
You produce STRUCTURED mutation plans for an enterprise architecture graph.
You MUST NOT output prose, code, React Flow nodes, or markdown.
You MUST output a single JSON object matching this schema:

{
  "summary": "<one sentence describing the change>",
  "rationale": "<short architectural reasoning, 1-2 sentences>",
  "mutations": [
    { "action": "<action>", "payload": { ... }, "reason": "<why>" }
  ],
  "warnings": ["<optional architectural caveats>"]
}

Allowed actions:
add_service, remove_service, update_service, add_connection, remove_connection,
update_connection, add_region, update_runtime, update_security.

Action payload shapes:
- add_service:    { "service": { "id"?: str, "name": str, "type": "compute|data|gateway|cache|queue|cdn|security|observability|external|client|storage", "runtime"?: str, "region"?: str, "criticality"?: "low|medium|high|critical", "exposure"?: "internal|public|partner", "tags"?: [str] } }
- remove_service: { "id": "<existing svc id>" }
- update_service: { "id": "<existing svc id>", "patch": { ... ServiceNode partial ... } }
- add_connection: { "connection": { "source": "<svc id>", "target": "<svc id>", "protocol": "http|https|grpc|tcp|kafka|sql|amqp|mqtt|graphql|mtls", "direction": "unidirectional|bidirectional", "encryption": "none|tls|mtls", "label"?: str, "async"?: bool } }
- remove_connection: { "id": "<existing connection id>" }
- update_connection: { "id": "<existing connection id>", "patch": { ... Connection partial ... } }
- add_region:        { "region": "us-east-1|us-west-2|eu-west-1|eu-central-1|ap-southeast-1|global|multi-region", "applyToServiceIds"?: ["<svc id>"] }
- update_runtime:    { "serviceId": "<existing svc id>", "runtime": "kubernetes|lambda|ec2|fargate|managed|browser|mobile|on-prem" }
- update_security:   { "serviceId": "<existing svc id>", "encryption"?: { "atRest"?: bool, "inTransit"?: bool }, "exposure"?: str, "criticality"?: str, "observability"?: bool }

STRICT RULES:
1. NEVER invent node IDs. Only reference:
   (a) IDs that appear in existingServices below, OR
   (b) IDs you explicitly created via add_service earlier in this same plan.
2. For add_service, you MAY supply an explicit "id" (kebab-case) if a later
   mutation in the same plan needs to reference it. Otherwise the system
   assigns one.
3. Keep mutation batches small and focused — typically 1-5 mutations.
   Prefer incremental improvements over massive redesigns.
4. Every mutation must include a "reason" stating the architectural intent.
5. If the user request is ambiguous or already satisfied, return an empty
   "mutations" array with a clear "summary".
6. Output ONLY the JSON object. No markdown fences. No commentary.

EXAMPLE — adding an audit service connected to an existing auth service:
{
  "summary": "Add an audit service for compliance event capture.",
  "rationale": "Centralizing auth events in a dedicated audit service simplifies HIPAA/SOC2 evidence collection.",
  "mutations": [
    {
      "action": "add_service",
      "payload": {
        "service": {
          "id": "audit-service",
          "name": "Audit Service",
          "type": "compute",
          "runtime": "kubernetes",
          "region": "us-east-1",
          "criticality": "high",
          "exposure": "internal",
          "encryption": { "atRest": true, "inTransit": true },
          "observability": true,
          "tags": ["audit", "compliance"]
        }
      },
      "reason": "Dedicated audit sink for compliance"
    },
    {
      "action": "add_connection",
      "payload": {
        "connection": {
          "source": "auth-service",
          "target": "audit-service",
          "protocol": "https",
          "direction": "unidirectional",
          "encryption": "tls"
        }
      },
      "reason": "Stream auth events to audit"
    }
  ]
}`;

export function buildUserPrompt(input: PlannerInput): string {
  const existingServices = input.graph.services.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    region: s.region,
    runtime: s.runtime,
    criticality: s.criticality,
  }));
  const existingConnections = input.graph.connections.map((c) => ({
    id: c.id,
    source: c.source,
    target: c.target,
    protocol: c.protocol,
    encryption: c.encryption,
  }));
  const ctx = {
    intent: {
      goal: input.intent.businessGoal,
      constraints: input.intent.constraints,
      compliance: input.intent.compliance,
      preferredStack: input.intent.preferredStack,
      avoid: input.intent.avoid,
      budget: input.intent.budget,
      scaleUsers: input.intent.scaleUsers,
      scalePeakRps: input.intent.scalePeakRps,
    },
    existingServices,
    existingConnections,
    request: input.prompt,
  };
  return [
    'Plan the SMALLEST set of mutations to satisfy the request below.',
    'Reference only IDs that appear in `existingServices`, or IDs you create earlier in the same plan.',
    'Return ONLY the strict JSON plan as defined in the system prompt.',
    '',
    '```json',
    JSON.stringify(ctx, null, 2),
    '```',
  ].join('\n');
}

/** Parse a raw model response into a RawPlan, tolerating fenced JSON. */
export function parsePlanResponse(text: string): RawPlan {
  if (!text || typeof text !== 'string') return { mutations: [] };
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('planner: response does not contain JSON');
  }
  const slice = body.slice(start, end + 1);
  try {
    return JSON.parse(slice) as RawPlan;
  } catch (err) {
    throw new Error(
      `planner: invalid JSON (${(err as Error).message}). Raw: ${slice.slice(0, 200)}…`,
    );
  }
}

interface SanitizeContext {
  knownServiceIds: Set<string>;
  knownConnectionIds: Set<string>;
}

function sanitizePayloadIds(
  action: MutationAction,
  payload: any,
  ctx: SanitizeContext,
): { ok: true; payload: any; createdServiceId?: string } | { ok: false; reason: string } {
  switch (action) {
    case 'add_service': {
      const svc = payload?.service;
      if (!svc?.name || !svc?.type) {
        return { ok: false, reason: 'add_service missing name/type' };
      }
      // If the planner supplied an explicit id, accept it but only if it's
      // not already taken — otherwise drop the id and let the executor mint one.
      if (typeof svc.id === 'string' && ctx.knownServiceIds.has(svc.id)) {
        delete svc.id;
      }
      return { ok: true, payload, createdServiceId: svc.id };
    }
    case 'remove_service':
    case 'update_service': {
      const id = payload?.id;
      if (!ctx.knownServiceIds.has(id)) {
        return { ok: false, reason: `references unknown service "${id}"` };
      }
      return { ok: true, payload };
    }
    case 'add_connection': {
      const conn = payload?.connection;
      if (!conn) return { ok: false, reason: 'add_connection missing connection' };
      if (!ctx.knownServiceIds.has(conn.source)) {
        return { ok: false, reason: `connection source "${conn.source}" not in graph` };
      }
      if (!ctx.knownServiceIds.has(conn.target)) {
        return { ok: false, reason: `connection target "${conn.target}" not in graph` };
      }
      return { ok: true, payload };
    }
    case 'remove_connection':
    case 'update_connection': {
      const id = payload?.id;
      if (!ctx.knownConnectionIds.has(id)) {
        return { ok: false, reason: `references unknown connection "${id}"` };
      }
      return { ok: true, payload };
    }
    case 'add_region':
      return { ok: true, payload };
    case 'update_runtime': {
      if (!ctx.knownServiceIds.has(payload?.serviceId)) {
        return { ok: false, reason: `update_runtime: unknown service "${payload?.serviceId}"` };
      }
      return { ok: true, payload };
    }
    case 'update_security': {
      if (!ctx.knownServiceIds.has(payload?.serviceId)) {
        return { ok: false, reason: `update_security: unknown service "${payload?.serviceId}"` };
      }
      return { ok: true, payload };
    }
  }
}

/**
 * Convert a RawPlan into a typed MutationPlan, dropping malformed mutations
 * AND any mutation that references an ID the planner hallucinated. We also
 * track add_service IDs created earlier in the plan so later mutations can
 * legitimately reference them.
 */
export function rawPlanToPlan(
  raw: RawPlan,
  graph: ArchitectureGraph,
  source: 'ai' | 'user' = 'ai',
): MutationPlan {
  const warnings: string[] = [...(raw.warnings ?? [])];
  const mutations: GraphMutation[] = [];

  const ctx: SanitizeContext = {
    knownServiceIds: new Set(graph.services.map((s) => s.id)),
    knownConnectionIds: new Set(graph.connections.map((c) => c.id)),
  };

  for (const m of raw.mutations ?? []) {
    if (!m || typeof m.action !== 'string') {
      warnings.push('Dropped mutation: missing action');
      continue;
    }
    if (!ALLOWED_ACTIONS.includes(m.action as MutationAction)) {
      warnings.push(`Dropped unknown action: ${m.action}`);
      continue;
    }
    if (!m.payload || typeof m.payload !== 'object') {
      warnings.push(`Dropped ${m.action}: missing payload`);
      continue;
    }
    const sanitized = sanitizePayloadIds(
      m.action as MutationAction,
      m.payload,
      ctx,
    );
    if (!sanitized.ok) {
      warnings.push(`Dropped ${m.action}: ${sanitized.reason}`);
      continue;
    }
    if (sanitized.createdServiceId) {
      ctx.knownServiceIds.add(sanitized.createdServiceId);
    }
    mutations.push(
      createMutation(
        m.action as MutationAction,
        sanitized.payload as MutationPayloadByAction[MutationAction],
        { source, reason: m.reason },
      ),
    );
  }

  return createPlan(raw.summary ?? 'AI plan', mutations, {
    rationale: raw.rationale,
    source,
    warnings: warnings.length ? warnings : undefined,
  });
}
