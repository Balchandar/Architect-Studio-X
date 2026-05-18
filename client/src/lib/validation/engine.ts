import type { ArchitectureGraph } from '@/types/graph';
import type { Insight } from '@/types/insights';
import { validationRules } from './rules';

export function runValidation(graph: ArchitectureGraph): Insight[] {
  const insights: Insight[] = [];
  for (const rule of validationRules) {
    try {
      insights.push(...rule(graph));
    } catch (err) {
      // a buggy rule should never break the engine
      console.error('validation rule threw', err);
    }
  }
  return insights;
}

export function summarizeBySeverity(insights: Insight[]) {
  const counts = { critical: 0, warning: 0, suggestion: 0, info: 0, ok: 0 };
  for (const i of insights) counts[i.severity]++;
  return counts;
}
