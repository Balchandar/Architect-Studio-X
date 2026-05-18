import dagre from 'dagre';
import type { ArchitectureGraph, ServiceNode } from '@/types/graph';

export interface LayoutPosition {
  x: number;
  y: number;
}

const NODE_W = 200;
const NODE_H = 80;

export function autoLayout(graph: ArchitectureGraph): Map<string, LayoutPosition> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 70, marginx: 30, marginy: 30 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const s of graph.services) {
    g.setNode(s.id, { width: NODE_W, height: NODE_H });
  }
  for (const c of graph.connections) {
    g.setEdge(c.source, c.target);
  }
  dagre.layout(g);

  const positions = new Map<string, LayoutPosition>();
  for (const s of graph.services) {
    const node = g.node(s.id);
    if (node) {
      positions.set(s.id, {
        x: node.x - NODE_W / 2,
        y: node.y - NODE_H / 2,
      });
    }
  }
  return positions;
}

export function applyLayout(graph: ArchitectureGraph): ArchitectureGraph {
  const positions = autoLayout(graph);
  return {
    ...graph,
    services: graph.services.map<ServiceNode>((s) => ({
      ...s,
      position: positions.get(s.id) ?? s.position ?? { x: 0, y: 0 },
    })),
  };
}
