import type { Edge, Node } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type { ArchitectureGraph, Connection, ServiceNode } from '@/types/graph';
import type { ServiceNodeData } from './ServiceNodeView';
import type { GroupNodeData } from './GroupNodeView';

const PROTOCOL_COLORS: Record<string, string> = {
  https: '#56a8ff',
  http: '#56a8ff',
  grpc: '#8b6cf6',
  tcp: '#4ade80',
  udp: '#4ade80',
  amqp: '#fb923c',
  kafka: '#fb923c',
  sql: '#4ade80',
  mqtt: '#4cc9f0',
  graphql: '#f472b6',
  mtls: '#f472b6',
};

export interface BuildFlowOpts {
  highlightedNodeIds?: string[];
}

export function buildNodes(graph: ArchitectureGraph, opts: BuildFlowOpts = {}): Node[] {
  const groups = collectGroups(graph.services);
  const groupNodes: Node[] = [...groups.entries()].map(([label, info]) => {
    const data: GroupNodeData = {
      label,
      width: info.width,
      height: info.height,
      tone: groupTone(label),
    };
    return {
      id: `group:${label}`,
      type: 'group-box',
      position: { x: info.x, y: info.y },
      data: data as unknown as Record<string, unknown>,
      draggable: false,
      selectable: false,
      zIndex: 0,
    };
  });

  const serviceNodes: Node[] = graph.services.map<Node>((s) => {
    const data: ServiceNodeData = {
      service: s,
      highlighted: opts.highlightedNodeIds?.includes(s.id) ?? false,
    };
    return {
      id: s.id,
      type: 'service',
      position: s.position ?? { x: 0, y: 0 },
      data: data as unknown as Record<string, unknown>,
      zIndex: 1,
    };
  });

  return [...groupNodes, ...serviceNodes];
}

export function buildEdges(graph: ArchitectureGraph, opts: BuildFlowOpts = {}): Edge[] {
  return graph.connections.map<Edge>((c: Connection) => {
    const colorBase = PROTOCOL_COLORS[c.protocol] ?? '#5e6378';
    const isHighlighted =
      opts.highlightedNodeIds?.includes(c.source) || opts.highlightedNodeIds?.includes(c.target);
    const stroke = isHighlighted ? '#fbbf24' : colorBase;
    return {
      id: c.id,
      source: c.source,
      target: c.target,
      label: c.label ?? c.protocol,
      animated: c.async === true,
      type: 'smoothstep',
      style: {
        stroke,
        strokeWidth: isHighlighted ? 1.8 : 1.2,
        opacity: c.async ? 0.95 : 0.85,
        strokeDasharray: c.async ? '4 4' : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        width: 14,
        height: 14,
      },
      labelStyle: { fill: '#c8ccdb', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
      labelBgStyle: { fill: '#141621' },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 3,
    };
  });
}

interface GroupBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function collectGroups(services: ServiceNode[]): Map<string, GroupBox> {
  const PADDING_X = 22;
  const PADDING_TOP = 32;
  const PADDING_BOTTOM = 22;
  const NODE_W = 200;
  const NODE_H = 80;

  const byGroup = new Map<string, ServiceNode[]>();
  for (const s of services) {
    if (!s.group) continue;
    byGroup.set(s.group, [...(byGroup.get(s.group) ?? []), s]);
  }
  const out = new Map<string, GroupBox>();
  for (const [label, members] of byGroup) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const m of members) {
      const px = m.position?.x ?? 0;
      const py = m.position?.y ?? 0;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px + NODE_W);
      maxY = Math.max(maxY, py + NODE_H);
    }
    if (!isFinite(minX)) continue;
    out.set(label, {
      x: minX - PADDING_X,
      y: minY - PADDING_TOP,
      width: maxX - minX + PADDING_X * 2,
      height: maxY - minY + PADDING_TOP + PADDING_BOTTOM,
    });
  }
  return out;
}

function groupTone(label: string): GroupNodeData['tone'] {
  if (/data/i.test(label)) return 'green';
  if (/external/i.test(label)) return 'neutral';
  if (/observ/i.test(label)) return 'cyan';
  if (/region/i.test(label)) return 'violet';
  if (/edge/i.test(label)) return 'pink';
  if (/application/i.test(label)) return 'violet';
  return 'neutral';
}
