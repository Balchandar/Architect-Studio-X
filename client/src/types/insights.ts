export type Severity = 'critical' | 'warning' | 'suggestion' | 'info' | 'ok';
export type Confidence = 'low' | 'medium' | 'high';

export interface Insight {
  id: string;
  category:
    | 'tradeoff'
    | 'security'
    | 'reliability'
    | 'cost'
    | 'suggestion'
    | 'adr'
    | 'validation';
  title: string;
  detail?: string;
  severity: Severity;
  confidence?: Confidence;
  affectedNodeIds?: string[];
  source: 'validation' | 'ai' | 'static';
}

export interface CostBreakdownItem {
  name: string;
  monthly: number;
}

export interface CostEstimate {
  monthlyTotal: number;
  currency: 'USD';
  topContributors: CostBreakdownItem[];
}

export interface InsightsBundle {
  tradeoffs: Insight[];
  security: Insight[];
  reliability: Insight[];
  suggestions: Insight[];
  validation: Insight[];
  adr: Insight[];
  cost: CostEstimate;
}
