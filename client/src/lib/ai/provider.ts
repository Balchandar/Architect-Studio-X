import type { ArchitectureGraph } from '@/types/graph';
import type { Insight } from '@/types/insights';
import type { IntentState, AIModel } from '@/types/intent';
import type { MutationPlan } from '@/types/mutations';

export interface AISuggestionResult {
  insights: Insight[];
}

export interface PlannerRequest {
  intent: IntentState;
  graph: ArchitectureGraph;
  prompt: string;
}

export interface AIProvider {
  id: AIModel;
  label: string;
  /** Deterministic validation — providers MUST never delegate this to an LLM. */
  validate(graph: ArchitectureGraph): Promise<Insight[]>;
  /** Reasoning-only suggestions (no graph mutations). */
  suggest(graph: ArchitectureGraph, intent: IntentState): Promise<AISuggestionResult>;
  /**
   * Plan structured graph mutations. NEVER auto-applied — the result is shown
   * to the user for explicit approval before flowing through the executor.
   */
  plan(req: PlannerRequest): Promise<MutationPlan>;
  /** Short prose summary of the current graph (for ADRs / commit messages). */
  summarize?(graph: ArchitectureGraph): Promise<string>;
}
