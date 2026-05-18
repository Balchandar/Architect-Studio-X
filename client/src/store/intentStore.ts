import { create } from 'zustand';
import type { IntentState, AIModel } from '@/types/intent';

const BLANK_INTENT: IntentState = {
  businessGoal: '',
  constraints: [],
  compliance: [],
  preferredStack: [],
  avoid: [],
  budget: '',
  scaleUsers: '',
  scalePeakRps: '',
  teamStrong: '',
  teamMedium: '',
  deploymentTargets: [],
  model: 'auto',
};

interface IntentStore extends IntentState {
  setBusinessGoal: (goal: string) => void;
  toggleListItem: (key: keyof IntentState, item: string) => void;
  addListItem: (key: keyof IntentState, item: string) => void;
  removeListItem: (key: keyof IntentState, item: string) => void;
  setField: <K extends keyof IntentState>(key: K, value: IntentState[K]) => void;
  setModel: (model: AIModel) => void;
  /** Wipe all intent fields, preserving only the AI model. */
  clearInputs: () => void;
}

export const useIntentStore = create<IntentStore>((set) => ({
  ...BLANK_INTENT,
  setBusinessGoal: (goal) => set({ businessGoal: goal }),
  toggleListItem: (key, item) =>
    set((state) => {
      const current = state[key] as unknown as string[];
      if (!Array.isArray(current)) return state;
      const next = current.includes(item)
        ? current.filter((x) => x !== item)
        : [...current, item];
      return { ...state, [key]: next } as Partial<IntentStore>;
    }),
  addListItem: (key, item) =>
    set((state) => {
      const current = state[key] as unknown as string[];
      if (!Array.isArray(current) || current.includes(item)) return state;
      return { ...state, [key]: [...current, item] } as Partial<IntentStore>;
    }),
  removeListItem: (key, item) =>
    set((state) => {
      const current = state[key] as unknown as string[];
      if (!Array.isArray(current)) return state;
      return { ...state, [key]: current.filter((x) => x !== item) } as Partial<IntentStore>;
    }),
  setField: (key, value) => set(({ [key]: value } as unknown) as Partial<IntentStore>),
  setModel: (model) => set({ model }),
  clearInputs: () => set((s) => ({ ...BLANK_INTENT, model: s.model })),
}));
