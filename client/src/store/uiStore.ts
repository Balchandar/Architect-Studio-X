import { create } from 'zustand';

export type BottomTab = 'history' | 'json' | 'diff' | 'events';
export type CenterTab = 'canvas' | 'dataflow';
export type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'asx.theme';

function readPersistedTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const t = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch {
    // ignore
  }
  return 'dark';
}

interface UIState {
  bottomTab: BottomTab;
  centerTab: CenterTab;
  bottomPanelOpen: boolean;
  rightPanelOpen: boolean;
  leftPanelOpen: boolean;
  newProjectOpen: boolean;
  settingsOpen: boolean;
  theme: Theme;
  /** True when the graph has unsaved manual changes that the user should
   *  be warned about before destructive actions (New Project, restore). */
  dirty: boolean;
  toast: { id: string; message: string; tone?: 'info' | 'success' | 'warning' | 'error' } | null;
  setBottomTab: (t: BottomTab) => void;
  setCenterTab: (t: CenterTab) => void;
  toggleBottomPanel: () => void;
  toggleRightPanel: () => void;
  toggleLeftPanel: () => void;
  openNewProject: () => void;
  closeNewProject: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setDirty: (dirty: boolean) => void;
  showToast: (message: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  bottomTab: 'history',
  centerTab: 'canvas',
  bottomPanelOpen: true,
  rightPanelOpen: true,
  leftPanelOpen: true,
  newProjectOpen: false,
  settingsOpen: false,
  theme: readPersistedTheme(),
  dirty: false,
  toast: null,
  setBottomTab: (t) => set({ bottomTab: t, bottomPanelOpen: true }),
  setCenterTab: (t) => set({ centerTab: t }),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  openNewProject: () => set({ newProjectOpen: true }),
  closeNewProject: () => set({ newProjectOpen: false }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setTheme: (t) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      // ignore
    }
    set({ theme: t });
  },
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return { theme: next };
    }),
  setDirty: (dirty) => set({ dirty }),
  showToast: (message, tone = 'info') =>
    set({ toast: { id: Math.random().toString(36).slice(2), message, tone } }),
  clearToast: () => set({ toast: null }),
}));
