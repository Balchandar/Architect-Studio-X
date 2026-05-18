// Plain-text architecture summary, suitable for clipboard, ADRs, or AI
// follow-up prompts. Deterministic — no LLM needed.

import type { ArchitectureGraph } from '@/types/graph';

export function architectureSummary(graph: ArchitectureGraph): string {
  const lines: string[] = [];
  lines.push(`# ${graph.metadata.name}`);
  if (graph.metadata.description) lines.push(graph.metadata.description);
  lines.push('');

  const byGroup = new Map<string, typeof graph.services>();
  for (const s of graph.services) {
    const k = s.group ?? 'Other';
    if (!byGroup.has(k)) byGroup.set(k, []);
    byGroup.get(k)!.push(s);
  }
  lines.push(`Services (${graph.services.length}):`);
  for (const [group, services] of byGroup) {
    lines.push(`  ${group}`);
    for (const s of services) {
      lines.push(
        `    - ${s.name} [${s.type}, ${s.runtime}, ${s.region}, ${s.criticality}]`,
      );
    }
  }
  lines.push('');

  lines.push(`Connections (${graph.connections.length}):`);
  for (const c of graph.connections) {
    const src = graph.services.find((s) => s.id === c.source)?.name ?? c.source;
    const dst = graph.services.find((s) => s.id === c.target)?.name ?? c.target;
    lines.push(
      `  - ${src} → ${dst} [${c.protocol}, ${c.encryption}${c.async ? ', async' : ''}]`,
    );
  }

  if (graph.constraints.length) {
    lines.push('');
    lines.push('Constraints:');
    for (const k of graph.constraints) lines.push(`  - ${k.kind}: ${k.label}`);
  }
  if (graph.decisions.length) {
    lines.push('');
    lines.push('Decisions:');
    for (const d of graph.decisions) lines.push(`  - ${d.title} (${d.status})`);
  }
  return lines.join('\n');
}
