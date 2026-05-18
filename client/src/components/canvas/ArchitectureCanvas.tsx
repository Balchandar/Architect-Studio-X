import { useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection as RFConnection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphStore } from '@/store/graphStore';
import type { ArchitectureGraph } from '@/types/graph';
import ServiceNodeView from './ServiceNodeView';
import GroupNodeView from './GroupNodeView';
import { buildEdges, buildNodes } from './buildFlow';
import Legend from './Legend';
import CanvasToolbar from './CanvasToolbar';

const nodeTypes = { service: ServiceNodeView, 'group-box': GroupNodeView };

// Structural fingerprint of the graph that excludes node positions. This lets
// us avoid rebuilding (and snapping back) React Flow's internal state on
// every drag commit — RF already tracks the live position during drag.
function structuralKey(graph: ArchitectureGraph): string {
  const services = graph.services
    .map(
      (s) =>
        `${s.id}|${s.name}|${s.type}|${s.runtime}|${s.region}|${s.criticality}|${s.exposure ?? ''}|${s.observability ? 1 : 0}|${s.group ?? ''}|${(s.tags ?? []).join(',')}|${s.encryption?.atRest ? 1 : 0}|${s.encryption?.inTransit ? 1 : 0}`,
    )
    .join('§');
  const conns = graph.connections
    .map(
      (c) =>
        `${c.id}|${c.source}|${c.target}|${c.protocol}|${c.encryption}|${c.direction}|${c.async ? 1 : 0}|${c.label ?? ''}`,
    )
    .join('§');
  return `${services}::${conns}`;
}

function CanvasInner() {
  const graph = useGraphStore((s) => s.graph);
  const highlightedNodeIds = useGraphStore((s) => s.highlightedNodeIds);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectedConnectionId = useGraphStore((s) => s.selectedConnectionId);
  const selectNode = useGraphStore((s) => s.selectNode);
  const selectConnection = useGraphStore((s) => s.selectConnection);
  const setNodePosition = useGraphStore((s) => s.setNodePosition);
  const addConnection = useGraphStore((s) => s.addConnection);
  const removeService = useGraphStore((s) => s.removeService);
  const removeConnection = useGraphStore((s) => s.removeConnection);

  const sKey = useMemo(() => structuralKey(graph), [graph]);
  const highlightKey = highlightedNodeIds.join(',');

  // Rebuild only when structural shape OR highlight set changes — not when
  // only positions change (otherwise RF would snap during drag commits).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const builtNodes = useMemo(() => buildNodes(graph, { highlightedNodeIds }), [sKey, highlightKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const builtEdges = useMemo(() => buildEdges(graph, { highlightedNodeIds }), [sKey, highlightKey]);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>(builtNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(builtEdges);

  useEffect(() => {
    setNodes(builtNodes);
  }, [builtNodes, setNodes]);
  useEffect(() => {
    setEdges(builtEdges);
  }, [builtEdges, setEdges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeBase(changes);
      for (const c of changes) {
        if (c.type === 'position' && 'position' in c && c.position && c.dragging === false) {
          if (!c.id.startsWith('group:')) {
            setNodePosition(c.id, c.position);
          }
        }
      }
    },
    [onNodesChangeBase, setNodePosition],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange],
  );

  // Keyboard delete: remove the currently-selected node or connection.
  // Skips when the user is typing in a form field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (selectedNodeId) {
        e.preventDefault();
        removeService(selectedNodeId);
      } else if (selectedConnectionId) {
        e.preventDefault();
        removeConnection(selectedConnectionId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNodeId, selectedConnectionId, removeService, removeConnection]);

  const handleConnect = useCallback(
    (params: RFConnection) => {
      if (!params.source || !params.target) return;
      addConnection({
        source: params.source,
        target: params.target,
        protocol: 'https',
        direction: 'unidirectional',
        encryption: 'tls',
      });
    },
    [addConnection],
  );

  return (
    <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(_, n) => {
          if (!n.id.startsWith('group:')) selectNode(n.id);
        }}
        onEdgeClick={(_, e) => selectConnection(e.id)}
        onPaneClick={() => {
          selectNode(null);
          selectConnection(null);
        }}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        minZoom={0.2}
        maxZoom={2.5}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="#262a3d"
        />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          maskColor="rgba(10, 11, 16, 0.7)"
          nodeColor={(n) => {
            const data = n.data as any;
            if (data?.service) {
              const service = data.service;
              const colorMap: Record<string, string> = {
                client: '#5e6378',
                cdn: '#8b6cf6',
                security: '#f87171',
                gateway: '#f472b6',
                compute: '#56a8ff',
                data: '#4ade80',
                cache: '#f87171',
                queue: '#fb923c',
                observability: '#4cc9f0',
                storage: '#fbbf24',
                external: '#5e6378',
              };
              return colorMap[service.type] ?? '#5e6378';
            }
            return 'transparent';
          }}
          nodeStrokeColor="#262a3d"
          nodeBorderRadius={3}
          pannable
          zoomable
        />
      </ReactFlow>
      <Legend />
      <CanvasToolbar />
    </div>
  );
}

export default function ArchitectureCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
