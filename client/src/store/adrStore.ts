// ADR draft store. Drafts are auto-generated after validation runs and
// after approved mutation plans. They never modify the graph directly —
// the user can promote them via the UI.

import { create } from 'zustand';
import type { ADRDraft } from '@/types/adr';

interface ADRState {
  drafts: ADRDraft[];
  addDrafts: (drafts: ADRDraft[]) => void;
  removeDraft: (id: string) => void;
  /** Replace any drafts of a given source — used by validation re-runs so
   *  re-running validate doesn't append duplicates. Plan-sourced drafts
   *  are never replaced (each approved plan gets its own audit entry). */
  replaceBySource: (source: ADRDraft['source'], next: ADRDraft[]) => void;
  clearAll: () => void;
}

export const useADRStore = create<ADRState>((set) => ({
  drafts: [],
  addDrafts: (drafts) =>
    set((s) => ({ drafts: [...drafts, ...s.drafts].slice(0, 30) })),
  removeDraft: (id) =>
    set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
  replaceBySource: (source, next) =>
    set((s) => ({
      drafts: [
        ...next,
        ...s.drafts.filter((d) => d.source !== source),
      ].slice(0, 30),
    })),
  clearAll: () => set({ drafts: [] }),
}));
