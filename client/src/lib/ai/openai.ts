// OpenAI-compatible provider. Talks to ANY OpenAI-compatible /chat/completions
// endpoint via the local server proxy at /api/ai/chat. The server keeps API
// keys/base URLs out of the browser and supports OpenAI, OpenRouter, Azure
// OpenAI, vLLM, LiteLLM, etc.

import type { ArchitectureGraph } from '@/types/graph';
import type { Insight } from '@/types/insights';
import type { AIModel } from '@/types/intent';
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

export interface OpenAICompatibleConfig {
  // Channel routes the server-side proxy to the right backend (openai,
  // openrouter, azure, ollama-openai, custom). Always required.
  channel: 'openai' | 'openrouter' | 'azure' | 'custom';
  baseURL?: string; // e.g. https://api.openai.com/v1
  model: string;
}

async function chatJSON(
  channel: string,
  baseURL: string | undefined,
  model: string,
  system: string,
  user: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel,
      baseURL,
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI chat failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { content?: string };
  if (typeof data.content !== 'string') {
    throw new Error('AI chat returned no content');
  }
  return data.content;
}

export function createOpenAIProvider(
  id: AIModel,
  cfg: OpenAICompatibleConfig,
): AIProvider {
  const fallback = createMockProvider(id);
  return {
    id,
    label: `${id.toUpperCase()} (${cfg.model})`,

    async validate(graph: ArchitectureGraph): Promise<Insight[]> {
      // Validation is deterministic — never delegated to an LLM.
      return runValidation(graph);
    },

    async suggest(graph: ArchitectureGraph): Promise<AISuggestionResult> {
      return { insights: runValidation(graph) };
    },

    async plan(req: PlannerRequest): Promise<MutationPlan> {
      try {
        const user = buildUserPrompt(req);
        const text = await chatJSON(
          cfg.channel,
          cfg.baseURL,
          cfg.model,
          PLANNER_SYSTEM_PROMPT,
          user,
        );
        const raw = parsePlanResponse(text);
        return rawPlanToPlan(raw, req.graph, 'ai');
      } catch (err) {
        console.warn('AI plan fell back to deterministic planner:', err);
        const plan = await fallback.plan(req);
        return {
          ...plan,
          warnings: [
            ...(plan.warnings ?? []),
            `Real provider unavailable: ${(err as Error).message}`,
          ],
        };
      }
    },

    async summarize(graph: ArchitectureGraph): Promise<string> {
      return fallback.summarize?.(graph) ?? '';
    },
  };
}
