// Auto-generated ADR draft. Distinct from the persisted ADR type in
// graph.ts — these are proposal drafts produced after validation runs or
// after approved plans, and live in their own store until the user
// promotes them to the graph.

export interface ADRDraft {
  id: string;
  title: string;
  decision: string;
  rationale: string;
  tradeoffs: string[];
  impact: string[];
  status: 'proposed';
  createdAt: string;
  source: 'plan' | 'validation';
  // Optional reference to the plan that triggered this draft.
  planId?: string;
}
