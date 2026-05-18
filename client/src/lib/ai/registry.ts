import type { AIModel } from '@/types/intent';
import type { AIProvider } from './provider';
import { createMockProvider } from './mock';
import { createOpenAIProvider } from './openai';
import { createOllamaProvider } from './ollama';

const cache = new Map<AIModel, AIProvider>();

export function getProvider(model: AIModel): AIProvider {
  if (cache.has(model)) return cache.get(model)!;
  let provider: AIProvider;
  switch (model) {
    case 'gpt':
      provider = createOpenAIProvider('gpt', { channel: 'openai', model: 'gpt-4o-mini' });
      break;
    case 'claude':
      // Routed through OpenAI-compatible /chat proxy (e.g. OpenRouter / LiteLLM).
      provider = createOpenAIProvider('claude', {
        channel: 'openrouter',
        model: 'anthropic/claude-sonnet-4-6',
      });
      break;
    case 'gemini':
      provider = createOpenAIProvider('gemini', {
        channel: 'openrouter',
        model: 'google/gemini-1.5-pro',
      });
      break;
    case 'ollama':
      provider = createOllamaProvider();
      break;
    case 'auto':
    default:
      provider = createMockProvider('auto');
  }
  cache.set(model, provider);
  return provider;
}

export function clearProviderCache() {
  cache.clear();
}
