import { create } from 'zustand';
import type { InsightsBundle } from '@/types/insights';
import { deriveInsights } from '@/lib/insights/derive';
import { adrsFromValidation } from '@/lib/insights/adr';
import { useGraphStore } from './graphStore';
import { useADRStore } from './adrStore';

const EMPTY_BUNDLE: InsightsBundle = {
  tradeoffs: [],
  security: [],
  reliability: [],
  suggestions: [],
  validation: [],
  adr: [],
  cost: { monthlyTotal: 0, currency: 'USD', topContributors: [] },
};

interface InsightsState {
  bundle: InsightsBundle;
  /** True only after the user explicitly runs Validate. New / template
   *  / blank workspaces start idle so the right panel doesn't preload
   *  tradeoffs, risks, or cost estimates. */
  validated: boolean;
  lastValidatedAt: string | null;
  recompute: () => void;
  /** Reset to idle (used by New Project + on graph change). */
  markIdle: () => void;
}

export const useInsightsStore = create<InsightsState>((set) => ({
  bundle: EMPTY_BUNDLE,
  validated: false,
  lastValidatedAt: null,
  recompute: () => {
    const graph = useGraphStore.getState().graph;
    set({
      bundle: deriveInsights(graph),
      validated: true,
      lastValidatedAt: new Date().toISOString(),
    });
    // Replace existing validation-sourced ADR drafts with the latest set.
    // Plan-sourced drafts are preserved (they are an audit trail).
    useADRStore.getState().replaceBySource('validation', adrsFromValidation(graph));
  },
  markIdle: () =>
    set({ bundle: EMPTY_BUNDLE, validated: false, lastValidatedAt: null }),
}));

// When the graph changes, the cached insights become stale — drop back to
// the idle state so the right panel re-prompts the user to validate.
useGraphStore.subscribe((state, prev) => {
  if (state.graph !== prev.graph) {
    useInsightsStore.setState({
      bundle: EMPTY_BUNDLE,
      validated: false,
      lastValidatedAt: null,
    });
  }
});
