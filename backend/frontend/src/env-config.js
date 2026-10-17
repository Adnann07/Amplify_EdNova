/**
 * Server-side environment configuration loader
 * Fetches API keys and config from backend endpoint instead of exposing them client-side
 * This keeps keys secure and prevents accidental commits to version control
 */

let _configCache = null;
let _configPromise = null;

function resolveBackendBase(viteEnv = getViteEnv()) {
  if (typeof window === 'undefined') return '';
  const origin = window.location?.origin || '';
  const host = window.location?.hostname || '';
  const configured = window.AMPLIFY_ENV?.BACKEND_URL || viteEnv.VITE_BACKEND_URL || '';
  if (!configured) return '';
  try {
    const parsed = new URL(String(configured), origin);
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    // In production pages, do not allow cross-origin backend override.
    if (!isLocalHost && parsed.origin !== origin) return '';
    return parsed.origin.replace(/\/$/, '');
  } catch {
    return '';
  }
}

/** Safe access to Vite env in ES modules (returns {} when not running under Vite). */
export function getViteEnv() {
  try {
    return import.meta?.env ?? {};
  } catch {
    return {};
  }
}

/**
 * Fetch environment config from server
 * Caches result to avoid multiple requests
 */
export async function loadEnvConfig() {
  // Return cached config if available
  if (_configCache) {
    return _configCache;
  }

  // Return existing promise to avoid duplicate requests
  if (_configPromise) {
    return _configPromise;
  }

  // Fetch from server
  _configPromise = (async () => {
    const viteEnv = getViteEnv();
    const BACKEND_URL = resolveBackendBase(viteEnv);
    const apiUrl = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api/config` : '/api/config';

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        console.warn(`[EnvConfig] Failed to load config: ${response.status}`);
        return getDefaultConfig();
      }

      const data = await response.json();
      _configCache = data;
      return data;
    } catch (error) {
      console.warn('[EnvConfig] Error fetching config:', error.message);
      return getDefaultConfig();
    } finally {
      _configPromise = null;
    }
  })();

  return _configPromise;
}

/**
 * Get default (empty) config for fallback
 */
function getDefaultConfig() {
  return {
    GROQ_API_KEY: '',
    GROQ_KEYS: [],
    GROQ_API_BASE_URL: 'https://api.groq.com/openai/v1',
    CEREBRAS_API_KEY: '',
    CEREBRAS_API_BASE: 'https://api.cerebras.ai/v1',
    OPENROUTER_KEYS: [],
    OPENROUTER_API_KEYS: [],
    OPENROUTER_BASE: 'https://openrouter.ai/api/v1',
    GEMINI_KEY: '',
    GEMINI_MODEL: 'gemini-2.0-flash-lite',
    GEMINI_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
  };
}

const PLACEHOLDER_KEY = /yourkey|your_groq|placeholder|^gsk_xxx|^sk-or-v1-xxx/i;

function filterValidKeys(keys) {
  return keys
    .map(k => String(k).trim())
    .filter(k => k && !PLACEHOLDER_KEY.test(k));
}

function normalizeApiBase(base, fallback) {
  let url = String(base || fallback).trim().replace(/\/+$/, '');
  url = url.replace(/\/chat\/completions$/, '');
  return url || fallback;
}

/** Resolve Groq API keys from server config, window bootstrap, or Vite env. */
export function getGroqKeys(config = {}, env = null) {
  const viteEnv = env ?? getViteEnv();
  for (const list of [
    config.GROQ_KEYS,
    typeof window !== 'undefined' ? window.AMPLIFY_ENV?.GROQ_KEYS : null,
  ]) {
    if (Array.isArray(list) && list.length) {
      const keys = filterValidKeys(list);
      if (keys.length) return keys;
    }
    if (typeof list === 'string' && list.trim()) {
      const keys = filterValidKeys(parseEnvList(list));
      if (keys.length) return keys;
    }
  }
  for (const key of [
    config.GROQ_API_KEY,
    typeof window !== 'undefined' ? window.AMPLIFY_ENV?.GROQ_KEY : '',
  ]) {
    const keys = filterValidKeys(parseEnvList(key));
    if (keys.length) return keys;
  }
  return filterValidKeys(parseEnvList(viteEnv.VITE_GROQ_KEYS || viteEnv.VITE_GROQ_KEY));
}

/** Resolve OpenRouter API keys from server config, window bootstrap, or Vite env. */
export function getOpenRouterKeys(config = {}, env = null) {
  const viteEnv = env ?? getViteEnv();
  for (const list of [
    config.OPENROUTER_KEYS,
    config.OPENROUTER_API_KEYS,
    typeof window !== 'undefined' ? window.AMPLIFY_ENV?.OPENROUTER_KEYS : null,
  ]) {
    if (Array.isArray(list) && list.length) {
      const keys = filterValidKeys(list);
      if (keys.length) return keys;
    }
    if (typeof list === 'string' && list.trim()) {
      const keys = filterValidKeys(parseEnvList(list));
      if (keys.length) return keys;
    }
  }
  return filterValidKeys(parseEnvList(viteEnv.VITE_OPENROUTER_KEYS || viteEnv.VITE_OPENROUTER_KEY));
}

export function getGroqBase(config = {}, env = null) {
  const viteEnv = env ?? getViteEnv();
  const base = config.GROQ_API_BASE_URL
    || (typeof window !== 'undefined' && window.AMPLIFY_ENV?.GROQ_BASE)
    || viteEnv.VITE_GROQ_BASE
    || 'https://api.groq.com/openai/v1';
  return normalizeApiBase(base, 'https://api.groq.com/openai/v1');
}

export function getOpenRouterBase(config = {}, env = null) {
  const viteEnv = env ?? getViteEnv();
  const base = config.OPENROUTER_BASE
    || config.OPENROUTER_BASE_URL
    || (typeof window !== 'undefined' && window.AMPLIFY_ENV?.OPENROUTER_BASE)
    || viteEnv.VITE_OPENROUTER_BASE
    || 'https://openrouter.ai/api/v1';
  return normalizeApiBase(base, 'https://openrouter.ai/api/v1');
}

/**
 * Get a single config value (waits for load if not cached)
 */
export async function getConfig(key) {
  const config = await loadEnvConfig();
  return config[key] || '';
}

/**
 * Parse environment list (comma or newline separated values)
 */
export function parseEnvList(value) {
  if (!value) return [];
  const trimmed = String(value).trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item).trim()).filter(Boolean);
    }
  } catch (e) {}
  return trimmed.split(/[\r\n,]+/).map(item => item.trim()).filter(Boolean);
}

// Initialize config load on module import (non-blocking)
if (typeof window !== 'undefined') {
  loadEnvConfig().catch(err => {
    console.warn('[EnvConfig] Background load error:', err.message);
  });
}
