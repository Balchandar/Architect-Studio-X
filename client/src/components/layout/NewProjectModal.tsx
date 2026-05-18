// New Project workflow — local-first, no persistence layer. Wipes the
// current graph, planner state, validation deltas, version history and
// event log; preserves AI provider/model and UI preferences.
//
// Mounted EXACTLY ONCE at App level and driven by uiStore.newProjectOpen.
// Any callsite that wants to trigger it should call useUIStore.openNewProject().

import { useEffect, useState } from 'react';
import { FilePlus2, Layers, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { applyLayout } from '@/lib/graph/layout';
import { architectureTemplates } from '@/lib/graph/templates';
import type { ArchitectureGraph } from '@/types/graph';
import { createEmptyGraph, useGraphStore } from '@/store/graphStore';
import { useInsightsStore } from '@/store/insightsStore';
import { useIntentStore } from '@/store/intentStore';
import { useMutationStore } from '@/store/mutationStore';
import { useUIStore } from '@/store/uiStore';
import { useVersionStore } from '@/store/versionStore';
import { useADRStore } from '@/store/adrStore';
import { clearWorkspace } from '@/lib/persistence/workspace';

type Mode = 'choose' | 'templates';

export default function NewProjectModal() {
  const open = useUIStore((s) => s.newProjectOpen);
  const close = useUIStore((s) => s.closeNewProject);
  const [mode, setMode] = useState<Mode>('choose');

  // Reset internal mode whenever the modal opens so it never reopens to a
  // stale "templates" tab after a previous session was closed mid-flow.
  useEffect(() => {
    if (open) setMode('choose');
  }, [open]);

  // Esc closes — keeps keyboard behavior consistent with the approval modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  /**
   * Hide the modal FIRST (so the next React commit unmounts it cleanly),
   * then run the reset cascade in a microtask. This guarantees the modal
   * + backdrop are gone before any heavy state changes ripple through
   * subscribers — eliminates any chance of overlay/state cross-rendering.
   */
  const performReset = (
    nextGraph: ArchitectureGraph,
    label: string,
    kind: 'blank' | 'template',
    meta?: Record<string, unknown>,
  ) => {
    close();
    queueMicrotask(() => {
      // Wipe the persisted workspace so the new project starts clean.
      clearWorkspace();
      useGraphStore.getState().selectNode(null);
      useGraphStore.getState().selectConnection(null);
      useGraphStore.getState().highlight([]);
      useGraphStore.getState().setGraph(nextGraph);
      useGraphStore.getState().resetHistory();
      useVersionStore.getState().clearAll();
      useMutationStore.getState().clearAll();
      useADRStore.getState().clearAll();
      if (kind === 'blank') {
        // Blank workspace = truly empty intent. Template flow keeps the
        // user's existing intent so they can iterate from it.
        useIntentStore.getState().clearInputs();
      }
      // New workspaces start idle — user runs Validate when they want a review.
      useInsightsStore.getState().markIdle();
      // Fresh project — dirty flag resets.
      useUIStore.getState().setDirty(false);
      useVersionStore
        .getState()
        .pushEvent('graph.template_loaded', label, 'user', { kind, ...meta });
      useUIStore.getState().showToast(label, 'success');
    });
  };

  const onBlank = () => {
    performReset(createEmptyGraph(), 'Started new blank project', 'blank');
  };

  const onTemplate = (id: string) => {
    const tpl = architectureTemplates.find((t) => t.id === id);
    if (!tpl) return;
    performReset(
      applyLayout(tpl.build()),
      `Started new project from "${tpl.name}"`,
      'template',
      { templateId: tpl.id },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
      onMouseDown={(e) => {
        // Backdrop click closes — only when the click started on the backdrop
        // itself, not bubbled from interactive children.
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-2xl bg-bg-1 border border-line rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-[fadeIn_120ms_ease-out]">
        <header className="flex items-start gap-3 px-5 py-4 border-b border-line">
          <div className="w-9 h-9 rounded-lg bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center shrink-0">
            <FilePlus2 className="w-4 h-4 text-accent-violet" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3">
              New project
            </div>
            <div className="text-[14px] font-semibold text-ink-0 mt-0.5">
              {mode === 'choose'
                ? 'Start a clean architecture workspace'
                : 'Pick a starter template'}
            </div>
            <div className="text-[12px] text-ink-2 mt-1 leading-snug">
              {mode === 'choose'
                ? 'Clears the current graph, version history, planner state, and event log. AI model + UI preferences are preserved.'
                : 'Templates load through the standard pipeline so you can immediately plan, validate, and version.'}
            </div>
          </div>
          <button className="text-ink-3 hover:text-ink-0 transition-colors" onClick={close}>
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mode === 'choose' ? (
            <div className="grid grid-cols-2 gap-3">
              <Card
                icon={<FilePlus2 className="w-4 h-4 text-accent-blue" />}
                title="Blank workspace"
                description="Start from scratch and build your architecture by hand or with the AI planner."
                onClick={onBlank}
              />
              <Card
                icon={<Layers className="w-4 h-4 text-accent-violet" />}
                title="From a template"
                description="Pick a domain-specific starter (healthcare, fintech, commerce, IDP, AI inference)."
                onClick={() => setMode('templates')}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {architectureTemplates.map((t) => (
                <button
                  key={t.id}
                  className="text-left panel-soft px-3 py-2.5 hover:bg-bg-3/40 border-line-soft hover:border-accent-violet/40 transition-colors"
                  onClick={() => onTemplate(t.id)}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-medium text-ink-0">{t.name}</span>
                    <span className="text-2xs uppercase tracking-[0.14em] text-ink-3">
                      {t.domain}
                    </span>
                  </div>
                  <div className="text-[12px] text-ink-2 leading-snug mt-0.5">
                    {t.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between px-5 py-3 border-t border-line bg-bg-1/80">
          <div className="text-[11px] text-ink-3 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent-violet" />
            Local-first — nothing is sent or persisted server-side.
          </div>
          {mode === 'templates' && (
            <button className="btn !py-1.5" onClick={() => setMode('choose')}>
              Back
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'text-left panel-soft px-4 py-3 border-line-soft transition-colors',
        'hover:bg-bg-3/40 hover:border-accent-violet/40',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[13px] font-medium text-ink-0">{title}</span>
      </div>
      <div className="text-[12px] text-ink-2 leading-snug">{description}</div>
    </button>
  );
}

