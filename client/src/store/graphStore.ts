import { create } from 'zustand';
import type { ArchitectureGraph, Connection, ServiceNode } from '@/types/graph';
import type { GraphMutation, MutationPlan, MutationResult } from '@/types/mutations';
import { applyLayout } from '@/lib/graph/layout';
import {
  applyMutation,
  applyMutations,
  applyPlan,
  createMutation,
} from '@/lib/graph/mutations';

/** Build a fresh, empty graph for "New Project" workflows. */
export function createEmptyGraph(name = 'Untitled Project'): ArchitectureGraph {
  const now = new Date().toISOString();
  return {
    metadata: { name, description: '', createdAt: now, updatedAt: now },
    services: [],
    connections: [],
    constraints: [],
    decisions: [],
  };
}

const HISTORY_LIMIT = 50;

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

interface GraphState {
  graph: ArchitectureGraph;
  /** Monotonic counter bumped on every *semantic* graph change (services,
   *  connections, constraints, decisions, name). Purely cosmetic updates —
   *  node drags, auto-layout — deliberately leave it untouched so downstream
   *  subscribers (e.g. the insights store) can ignore them. */
  semanticRev: number;
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  highlightedNodeIds: string[];

  /** Past + future graph snapshots. Pushed BEFORE every structural change.
   *  Cosmetic position updates do not push history. */
  past: ArchitectureGraph[];
  future: ArchitectureGraph[];

  // Source-of-truth API. Everything that mutates the graph must go through
  // one of these. Direct setState is a code smell.
  setGraph: (graph: ArchitectureGraph, opts?: { history?: boolean }) => void;
  setGraphName: (name: string) => void;
  autoLayout: () => void;
  selectNode: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  highlight: (ids: string[]) => void;
  resetHistory: () => void;

  // The mutation pipeline. These are the ONLY graph-mutating entry points.
  applyMutationToGraph: (mutation: GraphMutation) => MutationResult;
  applyMutationsToGraph: (mutations: GraphMutation[]) => MutationResult;
  applyPlanToGraph: (plan: MutationPlan) => MutationResult;

  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Convenience wrappers used by the canvas / inspector. They build a
  // typed mutation under the hood so the executor stays the single path.
  addService: (partial?: Partial<ServiceNode>) => string;
  removeService: (id: string) => void;
  updateService: (id: string, patch: Partial<ServiceNode>) => void;
  setNodePosition: (id: string, pos: { x: number; y: number }) => void;
  addConnection: (partial: Omit<Connection, 'id'> & { id?: string }) => string;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, patch: Partial<Connection>) => void;
}

const initialGraph = createEmptyGraph();

export const useGraphStore = create<GraphState>((set, get) => {
  /**
   * Push the current graph onto the past stack and clear the redo stack.
   * Called before any structural mutation; positional-only updates skip it.
   */
  function pushHistory() {
    const current = get().graph;
    set((s) => ({
      past: [...s.past, clone(current)].slice(-HISTORY_LIMIT),
      future: [],
    }));
  }

  /** Advance the semantic revision. Call from every path that changes graph
   *  meaning; skip it for position-only / layout updates. */
  function bumpRev() {
    set((s) => ({ semanticRev: s.semanticRev + 1 }));
  }

  return {
    graph: initialGraph,
    semanticRev: 0,
    selectedNodeId: null,
    selectedConnectionId: null,
    highlightedNodeIds: [],
    past: [],
    future: [],

    setGraph: (graph, opts) => {
      // Project loads (blank, template, undo, restore) reset history. Manual
      // setGraph callers can opt into history with { history: true }.
      if (opts?.history) pushHistory();
      else set({ past: [], future: [] });
      set({
        graph: { ...graph, metadata: { ...graph.metadata, updatedAt: new Date().toISOString() } },
      });
      bumpRev();
    },

    setGraphName: (name) => {
      pushHistory();
      set((s) => ({
        graph: {
          ...s.graph,
          metadata: { ...s.graph.metadata, name, updatedAt: new Date().toISOString() },
        },
      }));
      bumpRev();
    },

    autoLayout: () => set({ graph: applyLayout(get().graph) }),

    selectNode: (id) => set({ selectedNodeId: id, selectedConnectionId: null }),
    selectConnection: (id) => set({ selectedConnectionId: id, selectedNodeId: null }),
    highlight: (ids) => set({ highlightedNodeIds: ids }),
    resetHistory: () => set({ past: [], future: [] }),

    applyMutationToGraph: (mutation) => {
      try {
        const before = get().graph;
        const next = applyMutation(before, mutation);
        pushHistory();
        set({ graph: next });
        bumpRev();
        return { ok: true, applied: [mutation], errors: [] };
      } catch (err) {
        return {
          ok: false,
          applied: [],
          errors: [{ mutationId: mutation.id, message: (err as Error).message }],
        };
      }
    },

    applyMutationsToGraph: (mutations) => {
      const { graph: next, result } = applyMutations(get().graph, mutations);
      if (result.ok) {
        pushHistory();
        set({ graph: next });
        bumpRev();
      }
      return result;
    },

    applyPlanToGraph: (plan) => {
      const { graph: next, result } = applyPlan(get().graph, plan);
      if (result.ok) {
        pushHistory();
        set({ graph: next });
        bumpRev();
      }
      return result;
    },

    undo: () => {
      const { past, graph } = get();
      if (past.length === 0) return false;
      const prev = past[past.length - 1];
      set({
        past: past.slice(0, -1),
        future: [clone(graph), ...get().future].slice(0, HISTORY_LIMIT),
        graph: prev,
        selectedNodeId: null,
        selectedConnectionId: null,
      });
      bumpRev();
      return true;
    },

    redo: () => {
      const { future, graph } = get();
      if (future.length === 0) return false;
      const next = future[0];
      set({
        past: [...get().past, clone(graph)].slice(-HISTORY_LIMIT),
        future: future.slice(1),
        graph: next,
        selectedNodeId: null,
        selectedConnectionId: null,
      });
      bumpRev();
      return true;
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    addService: (partial) => {
      const m = createMutation(
        'add_service',
        {
          service: {
            name: partial?.name ?? 'New Service',
            type: partial?.type ?? 'compute',
            runtime: partial?.runtime,
            region: partial?.region,
            criticality: partial?.criticality,
            tags: partial?.tags,
            exposure: partial?.exposure,
            encryption: partial?.encryption,
            observability: partial?.observability,
            position: partial?.position ?? {
              x: 100 + Math.random() * 80,
              y: 100 + Math.random() * 80,
            },
            group: partial?.group,
          },
        },
        { source: 'user' },
      );
      const before = get().graph.services.length;
      const result = get().applyMutationToGraph(m);
      if (!result.ok) throw new Error(result.errors[0]?.message ?? 'add_service failed');
      const created = get().graph.services[before];
      return created?.id ?? '';
    },

    removeService: (id) => {
      const m = createMutation('remove_service', { id }, { source: 'user' });
      get().applyMutationToGraph(m);
      set((s) => ({
        selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      }));
    },

    updateService: (id, patch) => {
      const m = createMutation('update_service', { id, patch }, { source: 'user' });
      get().applyMutationToGraph(m);
    },

    setNodePosition: (id, pos) =>
      // Position is purely visual; bypassing the executor + history avoids
      // spamming the semantic event stream with cosmetic changes.
      set((s) => ({
        graph: {
          ...s.graph,
          services: s.graph.services.map((x) =>
            x.id === id ? { ...x, position: pos } : x,
          ),
        },
      })),

    addConnection: ({ id, ...rest }) => {
      const m = createMutation(
        'add_connection',
        { connection: { id, ...rest } },
        { source: 'user' },
      );
      const beforeCount = get().graph.connections.length;
      const result = get().applyMutationToGraph(m);
      if (!result.ok) throw new Error(result.errors[0]?.message ?? 'add_connection failed');
      return get().graph.connections[beforeCount]?.id ?? '';
    },

    removeConnection: (id) => {
      const m = createMutation('remove_connection', { id }, { source: 'user' });
      get().applyMutationToGraph(m);
      set((s) => ({
        selectedConnectionId:
          s.selectedConnectionId === id ? null : s.selectedConnectionId,
      }));
    },

    updateConnection: (id, patch) => {
      const m = createMutation('update_connection', { id, patch }, { source: 'user' });
      get().applyMutationToGraph(m);
    },
  };
});
