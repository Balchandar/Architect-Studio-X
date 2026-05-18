// Shared catalog of selectable AI models. Used by both the compose bar
// dropdown and the Settings → Models section so the list and labels stay
// in sync.

import type { AIModel } from '@/types/intent';

export interface ModelOption {
  value: AIModel;
  label: string;
  description: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'auto',
    label: 'Demo Planner (offline)',
    description:
      'Deterministic mock planner. Works without any API key — useful for offline demos and tests.',
  },
  {
    value: 'gpt',
    label: 'GPT',
    description: 'OpenAI GPT-4o family via the OpenAI-compatible proxy.',
  },
  {
    value: 'claude',
    label: 'Claude',
    description: 'Anthropic Claude Sonnet routed through OpenRouter.',
  },
  {
    value: 'gemini',
    label: 'Gemini',
    description: 'Google Gemini 1.5 Pro routed through OpenRouter.',
  },
  {
    value: 'ollama',
    label: 'Ollama',
    description: 'Local Ollama instance (default http://localhost:11434).',
  },
];

export function getModelOption(value: AIModel): ModelOption {
  return MODEL_OPTIONS.find((o) => o.value === value) ?? MODEL_OPTIONS[0];
}
