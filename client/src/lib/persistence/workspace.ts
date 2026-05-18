// Lightweight workspace persistence. Mirrors the conceptual `.asx`
// project workspace folder by storing the same shape in localStorage:
// graph, version history, ADR drafts, planner state, and intent.
//
// True directory-based `.asx` storage requires the File System Access API
// (window.showDirectoryPicker), which is Chromium-only. This module is the
// Preview-friendly fallback that survives reloads without prompting.

import type { ArchitectureGraph } from '@/types/graph';
import type { ArchitectureEvent, ArchitectureVersion } from '@/types/version';
import type { ADRDraft } from '@/types/adr';
import type { IntentState } from '@/types/intent';

export interface WorkspaceSnapshot {
  version: 1;
  savedAt: string;
  graph: ArchitectureGraph;
  versions: ArchitectureVersion[];
  events: ArchitectureEvent[];
  adrDrafts: ADRDraft[];
  intent: IntentState;
  plannerPrompt: string;
}

const KEY = 'asx.workspace.v1';

export function saveWorkspace(snap: WorkspaceSnapshot): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    // ignore — quota / private mode
  }
}

export function loadWorkspace(): WorkspaceSnapshot | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceSnapshot;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearWorkspace(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
