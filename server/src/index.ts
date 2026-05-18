// Thin AI proxy. Keeps provider API keys server-side and exposes one
// OpenAI-compatible endpoint plus one native Ollama endpoint. The client
// never holds upstream credentials. There is no application storage here —
// workspace state lives in the browser.
//
// Required env vars (any subset; the client falls back to the offline
// Demo Planner if none are set):
//   OPENAI_API_KEY,        OPENAI_BASE_URL?
//   OPENROUTER_API_KEY,    OPENROUTER_BASE_URL?
//   AZURE_OPENAI_KEY,      AZURE_OPENAI_BASE_URL,   AZURE_OPENAI_API_VERSION
//   CUSTOM_OPENAI_KEY,     CUSTOM_OPENAI_BASE_URL
//   OLLAMA_BASE_URL?       (default http://localhost:11434)

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const PORT = Number(process.env.PORT ?? 3001);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function resolveOpenAIChannel(channel: string, baseURLOverride?: string) {
  switch (channel) {
    case 'openai':
      return {
        baseURL: baseURLOverride ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY,
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
      };
    case 'openrouter':
      return {
        baseURL:
          baseURLOverride ?? process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
      };
    case 'azure':
      return {
        baseURL: baseURLOverride ?? process.env.AZURE_OPENAI_BASE_URL,
        apiKey: process.env.AZURE_OPENAI_KEY,
        authHeader: 'api-key',
        authPrefix: '',
      };
    case 'custom':
    default:
      return {
        baseURL: baseURLOverride ?? process.env.CUSTOM_OPENAI_BASE_URL,
        apiKey: process.env.CUSTOM_OPENAI_KEY,
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
      };
  }
}

app.post('/api/ai/chat', async (req, res) => {
  const {
    channel = 'openai',
    baseURL,
    model,
    messages,
    response_format,
    temperature,
  } = req.body ?? {};
  if (!model || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'model and messages are required' });
  }
  const cfg = resolveOpenAIChannel(channel, baseURL);
  if (!cfg.baseURL || !cfg.apiKey) {
    return res.status(501).json({
      error: 'ai-provider-not-configured',
      message:
        `No credentials for channel "${channel}". Set the corresponding env vars on the server (see docs).`,
    });
  }

  try {
    const url = `${cfg.baseURL.replace(/\/$/, '')}/chat/completions`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    headers[cfg.authHeader] = `${cfg.authPrefix}${cfg.apiKey}`;
    const body: Record<string, unknown> = {
      model,
      messages: messages as ChatMessage[],
      temperature: temperature ?? 0.2,
    };
    if (response_format) body.response_format = response_format;

    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: 'upstream', detail: text });
    }
    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    return res.json({ content });
  } catch (err) {
    return res.status(502).json({ error: 'upstream-failed', message: (err as Error).message });
  }
});

app.post('/api/ai/ollama', async (req, res) => {
  const { baseURL, model, messages, format, options } = req.body ?? {};
  if (!model || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'model and messages are required' });
  }
  const url = `${(baseURL ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '')}/api/chat`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, format, stream: false, options }),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: 'upstream', detail: text });
    }
    const data = (await upstream.json()) as { message?: { content?: string } };
    return res.json({ content: data.message?.content ?? '' });
  } catch (err) {
    return res
      .status(502)
      .json({ error: 'ollama-unreachable', message: (err as Error).message });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[architect-studio-x] api listening on :${PORT}`);
});
