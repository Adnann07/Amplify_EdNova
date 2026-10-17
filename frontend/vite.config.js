import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = env.VITE_API_URL || 'http://localhost:8001';
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8000';

  return {
    server: {
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/turn': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/generate': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/research': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/videos': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
