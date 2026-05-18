// Deterministic ADR-draft generator. Architecture Decision Records are
// produced from two triggers:
//   1. Approved mutation plans (the strongest source of intent).
//   2. Validation runs that surface critical / warning findings.
// The output never auto-applies — drafts live in the adrStore until the
// user accepts them.

import { nanoid } from 'nanoid';
import type { ArchitectureGraph } from '@/types/graph';
import type { Insight } from '@/types/insights';
import type { MutationPlan } from '@/types/mutations';
import type { ADRDraft } from '@/types/adr';
import { runValidation } from '@/lib/validation/engine';
import { describeMutation } from '@/lib/graph/mutations';

export interface PlanDeltaContext {
  before: ArchitectureGraph;
  after: ArchitectureGraph;
  pros: string[];
  cons: string[];
  resolvedFindings: Insight[];
}

export function adrFromPlan(plan: MutationPlan, ctx: PlanDeltaContext): ADRDraft {
  const decisionLines: string[] = [];
  for (const m of plan.mutations.slice(0, 6)) {
    decisionLines.push(`• ${describeMutation(m)}${m.reason ? ` — ${m.reason}` : ''}`);
  }
  if (plan.mutations.length > 6) {
    decisionLines.push(`• …and ${plan.mutations.length - 6} more mutation(s).`);
  }

  const tradeoffs = ctx.cons.length
    ? ctx.cons
    : ['No structural tradeoffs detected — change is largely additive.'];
  const impact: string[] = [];
  for (const p of ctx.pros) impact.push(p);
  for (const r of ctx.resolvedFindings.slice(0, 4)) {
    impact.push(`Resolves: ${r.title}`);
  }
  if (impact.length === 0) {
    impact.push('No architecture-level posture changes detected.');
  }

  return {
    id: `adr_plan_${plan.id}_${nanoid(4)}`,
    title: plan.summary,
    decision: decisionLines.join('\n') || plan.summary,
    rationale:
      plan.rationale ??
      `Iterative mutation batch composed by the planner to satisfy the request.`,
    tradeoffs,
    impact,
    status: 'proposed',
    createdAt: new Date().toISOString(),
    source: 'plan',
    planId: plan.id,
  };
}

/**
 * Roll up validation findings into a small number of themed ADR drafts,
 * rather than one ADR per finding. Themes: security posture, reliability
 * posture, observability/operability, cost/efficiency.
 */
export function adrsFromValidation(graph: ArchitectureGraph): ADRDraft[] {
  const findings = runValidation(graph);
  if (findings.length === 0) return [];

  const out: ADRDraft[] = [];
  const at = new Date().toISOString();

  const groupBy = (cat: string) =>
    findings.filter(
      (f) => f.category === cat && (f.severity === 'critical' || f.severity === 'warning'),
    );

  const security = groupBy('security');
  if (security.length) {
    out.push({
      id: `adr_val_security_${nanoid(4)}`,
      title: `Address ${security.length} security finding${security.length > 1 ? 's' : ''} before promotion`,
      decision: `Remediate the security gaps surfaced by the validator:\n${security
        .slice(0, 5)
        .map((f) => `• ${f.title}`)
        .join('\n')}${security.length > 5 ? `\n• …and ${security.length - 5} more.` : ''}`,
      rationale:
        'Validation flagged plaintext links, public datastore exposure, missing mTLS, or weak posture. These must be resolved to meet baseline security expectations.',
      tradeoffs: [
        'Adds operational overhead (cert rotation, key management)',
        'mTLS / WAF require infra changes and may surface latency in non-trivial topologies',
      ],
      impact: security.slice(0, 4).map((f) => `Resolves: ${f.title}`),
      status: 'proposed',
      createdAt: at,
      source: 'validation',
    });
  }

  const reliability = groupBy('reliability');
  if (reliability.length) {
    out.push({
      id: `adr_val_reliability_${nanoid(4)}`,
      title: `Improve reliability posture (${reliability.length} finding${reliability.length > 1 ? 's' : ''})`,
      decision: `Address single-region, SPOF, and observability gaps:\n${reliability
        .slice(0, 5)
        .map((f) => `• ${f.title}`)
        .join('\n')}${reliability.length > 5 ? `\n• …and ${reliability.length - 5} more.` : ''}`,
      rationale:
        'Single regions, missing replicas, and absent observability make operations brittle. Resilience and operability are required to commit to availability targets.',
      tradeoffs: [
        'Cross-region replication adds cost and consistency complexity',
        'Observability stack adds another component to maintain',
      ],
      impact: reliability.slice(0, 4).map((f) => `Resolves: ${f.title}`),
      status: 'proposed',
      createdAt: at,
      source: 'validation',
    });
  }

  return out;
}
