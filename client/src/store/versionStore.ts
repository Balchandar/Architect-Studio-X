import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ArchitectureGraph } from '@/types/graph';
import type {
  ArchitectureEvent,
  ArchitectureEventKind,
  ArchitectureVersion,
  EventActor,
} from '@/types/version';

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

interface VersionState {
  versions: ArchitectureVersion[];
  events: ArchitectureEvent[];
  compareLeftId: string | null;
  compareRightId: string | null;
  saveVersion: (
    graph: ArchitectureGraph,
    message: string,
    opts?: { planId?: string },
  ) => ArchitectureVersion;
  restoreVersion: (id: string) => ArchitectureGraph | null;
  pushEvent: (
    kind: ArchitectureEventKind,
    message: string,
    actor?: EventActor,
    meta?: Record<string, unknown>,
  ) => void;
  setCompare: (leftId: string | null, rightId: string | null) => void;
  /** Wipe all versions + events. Used by the New Project workflow. */
  clearAll: () => void;
}

// No fake seeded history — versions and events are produced by real
// user actions (compose, save, restore).
export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],
  events: [],
  compareLeftId: null,
  compareRightId: null,

  saveVersion: (graph, message, opts) => {
    const versions = get().versions;
    const next: ArchitectureVersion = {
      id: `ver_${nanoid(6)}`,
      label: `v${versions.length + 1}`,
      message: message || 'Snapshot',
      author: 'You (local)',
      createdAt: new Date().toISOString(),
      graph: clone(graph),
      planId: opts?.planId,
    };
    set({
      versions: [...versions, next],
      compareLeftId: versions.at(-1)?.id ?? null,
      compareRightId: next.id,
    });
    get().pushEvent('version.saved', `Saved ${next.label}: ${next.message}`, 'user');
    return next;
  },

  restoreVersion: (id) => {
    const v = get().versions.find((x) => x.id === id);
    if (!v) return null;
    get().pushEvent('version.restored', `Restored ${v.label}`, 'user');
    return clone(v.graph);
  },

  pushEvent: (kind, message, actor = 'user', meta) =>
    set((s) => ({
      events: [
        {
          id: `evt_${nanoid(6)}`,
          kind,
          message,
          at: new Date().toISOString(),
          actor,
          meta,
        },
        ...s.events,
      ].slice(0, 200),
    })),

  setCompare: (leftId, rightId) => set({ compareLeftId: leftId, compareRightId: rightId }),

  clearAll: () =>
    set({
      versions: [],
      events: [],
      compareLeftId: null,
      compareRightId: null,
    }),
}));
