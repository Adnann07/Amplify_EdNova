import { getViteEnv } from './env-config.js';

let configCache = null;
let configPromise = null;

function endpoint(path) {
  const env = getViteEnv();
  const configured = (typeof window !== 'undefined' && window.AMPLIFY_ENV?.BACKEND_URL)
    || env.VITE_BACKEND_URL
    || '';
  if (!configured) return `/llm/${path}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${new URL(String(configured), origin).origin}/llm/${path}`;
}

export async function getFelcloudConfig() {
  if (configCache) return configCache;
  if (configPromise) return configPromise;

  configPromise = (async () => {
    const response = await fetch(endpoint('config'), {
      headers: { Accept: 'application/json' },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || data.error?.message || `Felcloud configuration failed (${response.status}).`);
    }
    if (!data.compact_model || !data.midsize_model) {
      throw new Error('Configure FELCLOUD_COMPACT_MODEL and FELCLOUD_MIDSIZE_MODEL on the backend.');
    }
    configCache = data;
    return data;
  })();

  try {
    return await configPromise;
  } finally {
    configPromise = null;
  }
}

function retryDelayMs(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function felcloudChatCompletion(messages, {
  tier = 'midsize',
  model,
  maxTokens = 512,
  temperature = 0.7,
  responseFormat,
  signal,
  fallbackOnSaturation = true,
} = {}) {
  const config = await getFelcloudConfig();
  const selectedModel = model || (tier === 'compact' ? config.compact_model : config.midsize_model);
  const payload = {
    model: selectedModel,
    messages,
    max_tokens: Math.min(Math.max(1, Number(maxTokens) || 512), 4096),
    temperature,
  };
  if (responseFormat) payload.response_format = responseFormat;

  const send = async () => {
    const response = await fetch(endpoint('chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        data.detail || data.error?.message || `Felcloud request failed (${response.status}).`
      );
      error.status = response.status;
      error.retryAfter = response.headers.get('Retry-After');
      throw error;
    }
    const content = data.choices?.[0]?.message?.content;
    return typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map(part => part.text || '').join('')
        : '';
  };

  try {
    return await send();
  } catch (error) {
    if (error.status === 502 && error.message.includes('Could not connect to the configured Felcloud API.')) {
      await wait(retryDelayMs(error.retryAfter) ?? 1000);
      return send();
    }
    if ([502, 503, 504].includes(error.status) && tier === 'midsize' && fallbackOnSaturation && config.compact_model !== selectedModel) {
      return felcloudChatCompletion(messages, {
        tier: 'compact',
        maxTokens,
        temperature,
        responseFormat,
        signal,
        fallbackOnSaturation: false,
      });
    }
    if (error.status === 429) {
      const delay = retryDelayMs(error.retryAfter);
      if (delay !== null) {
        await wait(delay);
        return send();
      }
    }
    throw error;
  }
}
