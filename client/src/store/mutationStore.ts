// Pending-plan store for the approval workflow. AI providers (and the planner
// UI) deposit MutationPlans here. Nothing is applied to the graph until the
// user explicitly approves. This is the gate that keeps AI from mutating
// architecture state without consent.

import { create } from 'zustand';
import type { MutationPlan, MutationResult } from '@/types/mutations';

export interface ApprovalRecord {
  plan: MutationPlan;
  status: 'approved' | 'rejected';
  decidedAt: string;
  result?: MutationResult;
}

import type { ArchitectureGraph } from '@/types/graph';

interface MutationState {
  pending: MutationPlan | null;
  history: ApprovalRecord[];
  isPlanning: boolean;
  lastError: string | null;
  /** Live planner prompt text — lifted into the store so that
   *  reset/New-Project flows can clear it via clearAll(). */
  plannerPrompt: string;
  /** Snapshot taken immediately BEFORE the most recent approved plan was
   *  applied. Used by the one-step Undo affordance. */
  undoSnapshot: { graph: ArchitectureGraph; planSummary: string } | null;
  setPending: (plan: MutationPlan | null) => void;
  setPlanning: (planning: boolean) => void;
  setError: (msg: string | null) => void;
  recordDecision: (record: ApprovalRecord) => void;
  setUndoSnapshot: (snap: { graph: ArchitectureGraph; planSummary: string } | null) => void;
  setPlannerPrompt: (text: string) => void;
  /** Wipe pending plan, history, undo, error, planner prompt. */
  clearAll: () => void;
}

export const useMutationStore = create<MutationState>((set) => ({
  pending: null,
  history: [],
  isPlanning: false,
  lastError: null,
  plannerPrompt: '',
  undoSnapshot: null,
  setPending: (plan) => set({ pending: plan }),
  setPlanning: (planning) => set({ isPlanning: planning }),
  setError: (msg) => set({ lastError: msg }),
  recordDecision: (record) =>
    set((s) => ({ history: [record, ...s.history].slice(0, 50) })),
  setUndoSnapshot: (snap) => set({ undoSnapshot: snap }),
  setPlannerPrompt: (text) => set({ plannerPrompt: text }),
  clearAll: () =>
    set({
      pending: null,
      history: [],
      lastError: null,
      undoSnapshot: null,
      isPlanning: false,
      plannerPrompt: '',
    }),
}));
