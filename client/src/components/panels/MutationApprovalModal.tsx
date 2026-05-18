// Approval modal for AI/user proposed mutation plans. Groups mutations by
// affected service so the user sees an architecture review, not a raw
// mutation list.

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Minus,
  Plus,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import clsx from 'clsx';
import { useMutationStore } from '@/store/mutationStore';
import { useGraphStore } from '@/store/graphStore';
import {
  groupMutationsByService,
  mutationShortLabel,
} from '@/lib/graph/mutations';
import { previewPlan, approvePending, rejectPending } from '@/lib/ai/pipeline';
import type { GraphMutation, MutationPayloadByAction } from '@/types/mutations';

const MUTATION_TONE: Record<GraphMutation['action'], 'add' | 'remove' | 'update'> = {
  add_service: 'add',
  add_connection: 'add',
  add_region: 'add',
  remove_service: 'remove',
  remove_connection: 'remove',
  update_service: 'update',
  update_connection: 'update',
  update_runtime: 'update',
  update_security: 'update',
};

export default function MutationApprovalModal() {
  const pending = useMutationStore((s) => s.pending);
  const services = useGraphStore((s) => s.graph.services);

  const preview = useMemo(() => (pending ? previewPlan(pending) : null), [pending, services]);

  if (!pending || !preview) return null;

  const serviceById = new Map(services.map((s) => [s.id, s]));
  const blockingError = !!preview.applyError;
  const empty = pending.mutations.length === 0;
  const groups = groupMutationsByService(pending.mutations);

  const resolveLabel = (id: string, mutations: GraphMutation[]): string => {
    if (id === '__global__') return 'Architecture-wide';
    if (id.startsWith('__new__:')) return id.slice('__new__:'.length);
    const existing = serviceById.get(id);
    if (existing) return existing.name;
    // New service introduced in this plan — find its add_service mutation.
    for (const m of mutations) {
      if (m.action === 'add_service') {
        const p = m.payload as MutationPayloadByAction['add_service'];
        if ((p.service.id ?? '') === id) return p.service.name;
      }
    }
    return id;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="w-full max-w-xl bg-bg-1 border border-line rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-[fadeIn_120ms_ease-out]">
        <header className="flex items-start gap-3 px-5 py-4 border-b border-line">
          <div className="w-9 h-9 rounded-lg bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-accent-violet" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 flex items-center gap-2">
              <span>{pending.source === 'ai' ? 'AI proposal · review required' : 'Pending plan'}</span>
              {pending.warnings && pending.warnings.length > 0 && (
                <span className="text-2xs px-1.5 py-0 rounded bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow normal-case tracking-normal">
                  {pending.warnings.length} planner warning
                  {pending.warnings.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="text-[14px] font-semibold text-ink-0 mt-0.5">{pending.summary}</div>
            {pending.rationale && (
              <div className="text-[12px] text-ink-2 mt-1 leading-snug">{pending.rationale}</div>
            )}
          </div>
          <button
            className="text-ink-3 hover:text-ink-0 transition-colors"
            onClick={rejectPending}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {(preview.impact.pros.length > 0 ||
            preview.impact.cons.length > 0 ||
            preview.resolvedFindings.length > 0) && (
            <section className="panel-soft px-3 py-2.5 space-y-1.5">
              <div className="text-2xs uppercase tracking-[0.14em] text-ink-3">
                Architecture impact
              </div>
              <ul className="space-y-1">
                {preview.resolvedFindings.slice(0, 4).map((f) => (
                  <li
                    key={f.id}
                    className="text-[12px] text-accent-green flex items-start gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Resolves: {f.title}</span>
                  </li>
                ))}
                {preview.impact.pros.map((p) => (
                  <li
                    key={p}
                    className="text-[12px] text-accent-green flex items-start gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {p}
                  </li>
                ))}
                {preview.impact.cons.map((c) => (
                  <li
                    key={c}
                    className="text-[12px] text-accent-yellow flex items-start gap-1.5"
                  >
                    <Minus className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {c}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="text-2xs uppercase tracking-[0.14em] text-ink-3 mb-2">
              Changes ({pending.mutations.length})
            </div>
            {empty ? (
              <div className="text-[12px] text-ink-2">
                The planner produced no mutations. The graph would not change.
              </div>
            ) : (
              <ul className="space-y-2">
                {groups.map((g) => (
                  <li key={g.serviceId} className="panel-soft px-3 py-2">
                    <div className="text-[12.5px] font-semibold text-ink-0 mb-1.5">
                      {resolveLabel(g.serviceId, g.mutations)}
                    </div>
                    <ul className="space-y-0.5">
                      {g.mutations.map((m) => {
                        const tone = MUTATION_TONE[m.action];
                        const symbol = tone === 'add' ? '+' : tone === 'remove' ? '−' : '~';
                        return (
                          <li
                            key={m.id}
                            className={clsx(
                              'text-[12px] leading-snug flex items-start gap-2',
                              tone === 'add' && 'text-accent-green',
                              tone === 'remove' && 'text-accent-red',
                              tone === 'update' && 'text-accent-yellow',
                            )}
                          >
                            <span className="font-mono w-3 text-center shrink-0">{symbol}</span>
                            <span className="flex-1">
                              {mutationShortLabel(m)}
                              {m.reason && (
                                <span className="text-ink-3 text-[11px] ml-1">— {m.reason}</span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {pending.warnings && pending.warnings.length > 0 && (
            <section>
              <div className="text-2xs uppercase tracking-[0.14em] text-ink-3 mb-2">
                Planner warnings
              </div>
              <ul className="space-y-1">
                {pending.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="text-[12px] text-accent-yellow flex items-start gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {w}
                  </li>
                ))}
              </ul>
              <div className="mt-1 text-[11px] text-ink-3 leading-snug">
                Invalid references were ignored automatically. Validation engine
                remains strict.
              </div>
            </section>
          )}

          {preview.newWarnings.length > 0 && (
            <section>
              <div className="text-2xs uppercase tracking-[0.14em] text-ink-3 mb-2">
                New validation findings after apply
              </div>
              <ul className="space-y-1">
                {preview.newWarnings.slice(0, 8).map((i) => (
                  <li
                    key={i.id}
                    className={clsx(
                      'text-[12px] flex items-start gap-1.5',
                      i.severity === 'critical' && 'text-accent-red',
                      i.severity === 'warning' && 'text-accent-yellow',
                      i.severity === 'suggestion' && 'text-accent-blue',
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium">{i.title}</span>
                      {i.detail && <span className="text-ink-2"> — {i.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {blockingError && (
            <div className="text-[12px] text-accent-red bg-accent-red/10 border border-accent-red/30 rounded-md px-3 py-2">
              Plan cannot be applied as-is: {preview.applyError}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-line bg-bg-1/80">
          <button className="btn !py-1.5" onClick={rejectPending}>
            <X className="w-3.5 h-3.5" /> Reject
          </button>
          <button
            className="btn btn-primary !py-1.5"
            onClick={approvePending}
            disabled={blockingError || empty}
          >
            <Check className="w-3.5 h-3.5" /> Approve & Apply
          </button>
        </footer>
      </div>
    </div>
  );
}
