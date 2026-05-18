// The mutation pipeline — the single orchestration entry point used by the
// AI planner UI. Implements the canonical flow described in the product spec:
//
//   Intent → Structured Mutation Plan → Validation → User Approval
//          → Graph Mutation → Version Snapshot → UI Update
//
// AI never bypasses this. The user can also manually approve template loads
// or hand-built plans through the same path.

import { applyLayout } from '@/lib/graph/layout';
import { runValidation } from '@/lib/validation/engine';
import { affectedNodeIds, applyPlan } from '@/lib/graph/mutations';
import { adrFromPlan } from '@/lib/insights/adr';
import { useGraphStore } from '@/store/graphStore';
import { useMutationStore } from '@/store/mutationStore';
import { useVersionStore } from '@/store/versionStore';
import { useUIStore } from '@/store/uiStore';
import { useADRStore } from '@/store/adrStore';
import type { ArchitectureGraph } from '@/types/graph';
import type { MutationPlan } from '@/types/mutations';
import type { Insight } from '@/types/insights';

export interface PlanImpact {
  // High-level human bullets, deterministic from the diff.
  pros: string[];
  cons: string[];
}

export interface PlanPreview {
  plan: MutationPlan;
  affectedNodeIds: string[];
  // Validation insights AFTER applying the plan deterministically.
  postValidation: Insight[];
  // Insights that are NEW vs the current graph (delta).
  newWarnings: Insight[];
  // Validation findings that the plan RESOLVES (present before, gone after).
  resolvedFindings: Insight[];
  impact: PlanImpact;
  applyError?: string;
}

function computeImpact(before: ArchitectureGraph, after: ArchitectureGraph): PlanImpact {
  const pros: string[] = [];
  const cons: string[] = [];

  const addedServices = after.services.filter(
    (s) => !before.services.some((b) => b.id === s.id),
  );
  const removedServices = before.services.filter(
    (s) => !after.services.some((a) => a.id === s.id),
  );
  const addedConns = after.connections.filter(
    (c) => !before.connections.some((b) => b.id === c.id),
  );

  // Resilience: new region or observability or cache.
  const beforeRegions = new Set(before.services.map((s) => s.region));
  const afterRegions = new Set(after.services.map((s) => s.region));
  const newRegions = [...afterRegions].filter((r) => !beforeRegions.has(r));
  if (newRegions.length) {
    pros.push(`Improved resiliency — added region${newRegions.length > 1 ? 's' : ''} ${newRegions.join(', ')}`);
  }
  if (
    !before.services.some((s) => s.type === 'observability') &&
    after.services.some((s) => s.type === 'observability')
  ) {
    pros.push('Improved operability — observability stack introduced');
  }
  if (
    !before.services.some((s) => s.type === 'cache') &&
    after.services.some((s) => s.type === 'cache')
  ) {
    pros.push('Lower read latency — cache layer introduced');
  }
  if (
    !before.services.some((s) => s.type === 'queue') &&
    after.services.some((s) => s.type === 'queue')
  ) {
    pros.push('Looser coupling — async queue/event bus introduced');
  }

  // Security: new mTLS or in-transit encryption.
  const newMtls = addedConns.filter((c) => c.encryption === 'mtls').length;
  if (newMtls) pros.push(`Stronger identity — ${newMtls} mTLS connection${newMtls > 1 ? 's' : ''}`);
  const tightenedSecurity = after.services.filter((a) => {
    const b = before.services.find((x) => x.id === a.id);
    return (
      b &&
      b.encryption?.inTransit === false &&
      a.encryption?.inTransit === true
    );
  });
  if (tightenedSecurity.length) {
    pros.push(`Encrypted in transit — ${tightenedSecurity.length} service${tightenedSecurity.length > 1 ? 's' : ''}`);
  }

  // Cost / complexity heuristics.
  if (addedServices.length >= 1) {
    cons.push(`Increased infrastructure cost — ${addedServices.length} new service${addedServices.length > 1 ? 's' : ''}`);
  }
  if (addedServices.some((s) => s.type === 'queue' || s.type === 'cache')) {
    cons.push('Added operational surface — new component to monitor and back up');
  }
  if (removedServices.length) {
    cons.push(`Removed ${removedServices.length} service${removedServices.length > 1 ? 's' : ''} — verify no dangling consumers`);
  }
  if (newRegions.length && newRegions.some((r) => r !== 'global')) {
    cons.push('Cross-region replication adds latency and complexity');
  }

  return { pros, cons };
}

export function previewPlan(plan: MutationPlan): PlanPreview {
  const graph = useGraphStore.getState().graph;
  const before = runValidation(graph);
  const beforeIds = new Set(before.map((i) => i.id));
  const { graph: next, result } = applyPlan(graph, plan);
  if (!result.ok) {
    return {
      plan,
      affectedNodeIds: plan.mutations.flatMap(affectedNodeIds),
      postValidation: before,
      newWarnings: [],
      resolvedFindings: [],
      impact: { pros: [], cons: [] },
      applyError: result.errors.map((e) => e.message).join('; '),
    };
  }
  const after = runValidation(next);
  const afterIds = new Set(after.map((i) => i.id));
  const newWarnings = after.filter((i) => !beforeIds.has(i.id));
  const resolvedFindings = before.filter((i) => !afterIds.has(i.id));
  return {
    plan,
    affectedNodeIds: plan.mutations.flatMap(affectedNodeIds),
    postValidation: after,
    newWarnings,
    resolvedFindings,
    impact: computeImpact(graph, next),
  };
}

export function proposePlan(plan: MutationPlan) {
  useMutationStore.getState().setPending(plan);
  useVersionStore
    .getState()
    .pushEvent('plan.proposed', `Proposed: ${plan.summary}`, plan.source === 'ai' ? 'ai' : 'user', {
      planId: plan.id,
      mutations: plan.mutations.length,
    });
}

export function approvePending() {
  const ms = useMutationStore.getState();
  const plan = ms.pending;
  if (!plan) return { ok: false, error: 'No pending plan.' };
  const gs = useGraphStore.getState();
  // Snapshot the current graph BEFORE apply so the user can undo in one click.
  const beforeGraph = JSON.parse(JSON.stringify(gs.graph)) as typeof gs.graph;
  const result = gs.applyPlanToGraph(plan);
  if (!result.ok) {
    useUIStore
      .getState()
      .showToast(`Plan rejected: ${result.errors[0]?.message ?? 'unknown'}`, 'error');
    return { ok: false, error: result.errors[0]?.message };
  }
  // Auto-layout to avoid stale positions for newly added services.
  useGraphStore.setState({ graph: applyLayout(useGraphStore.getState().graph) });
  ms.setUndoSnapshot({ graph: beforeGraph, planSummary: plan.summary });
  ms.recordDecision({
    plan,
    status: 'approved',
    decidedAt: new Date().toISOString(),
    result,
  });
  ms.setPending(null);

  // Auto-generate an ADR draft for the approved plan. The draft captures
  // decision, rationale, tradeoffs, and impact deterministically from the
  // before/after diff — no LLM round-trip.
  const after = useGraphStore.getState().graph;
  const beforeFindings = runValidation(beforeGraph);
  const afterFindings = runValidation(after);
  const afterIds = new Set(afterFindings.map((i) => i.id));
  const resolvedFindings = beforeFindings.filter((f) => !afterIds.has(f.id));
  const draft = adrFromPlan(plan, {
    before: beforeGraph,
    after,
    pros: [],
    cons: [],
    resolvedFindings,
  });
  // Reuse the diff-driven impact computation by swapping in the live impact
  // (kept inline to avoid moving computeImpact across files).
  const impact = computeImpact(beforeGraph, after);
  draft.impact = [...impact.pros, ...draft.impact.filter((s) => s.startsWith('Resolves:'))];
  if (impact.cons.length) draft.tradeoffs = impact.cons;
  useADRStore.getState().addDrafts([draft]);

  // Snapshot the resulting graph as a version (auto-save after compose).
  const v = useVersionStore.getState().saveVersion(useGraphStore.getState().graph, plan.summary, {
    planId: plan.id,
  });
  // Compose-driven changes are persisted via the auto-snapshot above —
  // workspace is no longer "dirty" relative to a version.
  useUIStore.getState().setDirty(false);
  useVersionStore
    .getState()
    .pushEvent(
      'plan.approved',
      `Approved & applied: ${plan.summary} (${result.applied.length} mutations) → ${v.label}`,
      plan.source === 'ai' ? 'ai' : 'user',
      { planId: plan.id, versionId: v.id },
    );
  for (const m of result.applied) {
    useVersionStore
      .getState()
      .pushEvent('mutation.applied', `${m.action}: ${m.reason ?? ''}`.trim(), m.source ?? 'user', {
        mutationId: m.id,
        action: m.action,
      });
  }
  useUIStore.getState().showToast(`Applied ${result.applied.length} mutation(s)`, 'success');
  return { ok: true };
}

export function rejectPending() {
  const ms = useMutationStore.getState();
  const plan = ms.pending;
  if (!plan) return;
  ms.recordDecision({
    plan,
    status: 'rejected',
    decidedAt: new Date().toISOString(),
  });
  ms.setPending(null);
  useVersionStore
    .getState()
    .pushEvent('plan.rejected', `Rejected: ${plan.summary}`, 'user', { planId: plan.id });
  useUIStore.getState().showToast('Plan rejected', 'info');
}

/**
 * One-step undo of the most recently applied plan. Restores the graph to its
 * pre-apply state and records an event. Does NOT roll back the version
 * history (the auto-snapshot remains so the apply is auditable).
 */
export function undoLastApply(): boolean {
  const ms = useMutationStore.getState();
  const snap = ms.undoSnapshot;
  if (!snap) {
    useUIStore.getState().showToast('Nothing to undo', 'info');
    return false;
  }
  useGraphStore.getState().setGraph(snap.graph);
  ms.setUndoSnapshot(null);
  useVersionStore
    .getState()
    .pushEvent('plan.rejected', `Undid: ${snap.planSummary}`, 'user');
  useUIStore.getState().showToast(`Undid "${snap.planSummary}"`, 'info');
  return true;
}
