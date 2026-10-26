/**
 * Environment bootstrap for static HTML pages
 * Loads non-secret Felcloud model settings for static pages.
 */

(async function initAmplifyEnv() {
  try {
    const origin = window.location?.origin || '';
    const host = window.location?.hostname || '';
    const configured = window.AMPLIFY_ENV?.BACKEND_URL || '';
    let base = '';
    if (configured) {
      try {
        const parsed = new URL(String(configured), origin);
        const isLocalHost = host === 'localhost' || host === '127.0.0.1';
        if (isLocalHost || parsed.origin === origin) {
          base = parsed.origin.replace(/\/$/, '');
        }
      } catch {}
    }
    const response = await fetch(base ? `${base}/llm/config` : '/llm/config', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (response.ok) {
      const config = await response.json();
      window.AMPLIFY_ENV = window.AMPLIFY_ENV || {};
      window.AMPLIFY_ENV.FELCLOUD_COMPACT_MODEL = config.compact_model || '';
      window.AMPLIFY_ENV.FELCLOUD_MIDSIZE_MODEL = config.midsize_model || '';
      window.AMPLIFY_ENV.FELCLOUD_VISION_MODEL = config.vision_model || '';
      console.log('[AmplifyEnv] Config loaded from server');
    } else {
      console.warn('[AmplifyEnv] Failed to load config:', response.status);
    }
  } catch (error) {
    console.warn('[AmplifyEnv] Error:', error.message);
  }
})();
