// Ollama provider. Talks to a local Ollama instance through the server proxy
// at /api/ai/ollama (which forwards to OLLAMA_BASE_URL or http://localhost:11434).

import type { ArchitectureGraph } from '@/types/graph';
import type { Insight } from '@/types/insights';
import type { MutationPlan } from '@/types/mutations';
import type { AIProvider, AISuggestionResult, PlannerRequest } from './provider';
import { createMockProvider } from './mock';
import {
  PLANNER_SYSTEM_PROMPT,
  buildUserPrompt,
  parsePlanResponse,
  rawPlanToPlan,
} from './planner';
import { runValidation } from '@/lib/validation/engine';

export interface OllamaConfig {
  baseURL?: string; // default http://localhost:11434 (server-side)
  model: string; // e.g. qwen2.5, llama3.1, deepseek-r1, mistral
  timeoutMs?: number;
}

async function ollamaChat(cfg: OllamaConfig, system: string, user: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs ?? 60_000);
  try {
    const res = await fetch('/api/ai/ollama', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseURL: cfg.baseURL,
        model: cfg.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        format: 'json',
        options: { temperature: 0.2 },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Ollama failed: ${res.status} ${t}`);
    }
    const data = (await res.json()) as { content?: string };
    if (typeof data.content !== 'string') {
      throw new Error('Ollama returned no content');
    }
    return data.content;
  } finally {
    clearTimeout(timer);
  }
}

export function createOllamaProvider(model = 'llama3.1'): AIProvider {
  const cfg: OllamaConfig = { model };
  const fallback = createMockProvider('ollama');
  return {
    id: 'ollama',
    label: `Ollama (${model})`,

    async validate(graph: ArchitectureGraph): Promise<Insight[]> {
      return runValidation(graph);
    },
    async suggest(graph: ArchitectureGraph): Promise<AISuggestionResult> {
      return { insights: runValidation(graph) };
    },
    async plan(req: PlannerRequest): Promise<MutationPlan> {
      try {
        const user = buildUserPrompt(req);
        const text = await ollamaChat(cfg, PLANNER_SYSTEM_PROMPT, user);
        const raw = parsePlanResponse(text);
        return rawPlanToPlan(raw, req.graph, 'ai');
      } catch (err) {
        console.warn('Ollama plan fell back to deterministic planner:', err);
        const plan = await fallback.plan(req);
        return {
          ...plan,
          warnings: [
            ...(plan.warnings ?? []),
            `Ollama unavailable: ${(err as Error).message}`,
          ],
        };
      }
    },
    async summarize(graph: ArchitectureGraph): Promise<string> {
      return fallback.summarize?.(graph) ?? '';
    },
  };
}
