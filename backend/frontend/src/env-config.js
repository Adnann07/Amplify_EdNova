let configCache = null;
let configPromise = null;

export function getViteEnv() {
  try {
    return import.meta.env ?? {};
  } catch {
    return {};
  }
}

function resolveBackendBase() {
  if (typeof window === 'undefined') return '';
  const configured = window.AMPLIFY_ENV?.BACKEND_URL || getViteEnv().VITE_BACKEND_URL || '';
  if (!configured) return '';
  try {
    return new URL(String(configured), window.location.origin).origin.replace(/\/$/, '');
  } catch {
    return '';
  }
}

export async function loadEnvConfig() {
  if (configCache) return configCache;
  if (configPromise) return configPromise;

  configPromise = (async () => {
    const base = resolveBackendBase();
    const url = base ? `${base}/llm/config` : '/llm/config';
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || `Felcloud configuration failed (${response.status}).`);
    }
    if (!data.compact_model || !data.midsize_model) {
      throw new Error('The Felcloud compact and mid-size models are not configured.');
    }
    configCache = data;
    return configCache;
  })();

  try {
    return await configPromise;
  } finally {
    configPromise = null;
  }
}
