import { defineConfig, loadEnv } from 'vite';
import { resolve, relative, extname } from 'node:path';
import fs from 'node:fs';

function findHtmlInputs(dir, baseDir = dir) {
  const entries = {};
  if (!fs.existsSync(dir)) return entries;
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = resolve(dir, item.name);
    if (item.isDirectory()) {
      if (['dist', 'node_modules', '.vercel', '.git', 'public', 'images'].includes(item.name)) continue;
      Object.assign(entries, findHtmlInputs(fullPath, baseDir));
    } else if (item.isFile() && extname(item.name) === '.html') {
      const relPath = relative(baseDir, fullPath).replace(/\\/g, '/');
      const key = relPath.replace(/\.html$/, '').replace(/[^a-zA-Z0-9]/g, '_') || 'main';
      entries[key] = fullPath;
    }
  }

  return entries;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = env.VITE_API_URL || 'http://localhost:8001';
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8000';

  const htmlInputs = {
    main: resolve(process.cwd(), 'index.html'),
    ...findHtmlInputs(process.cwd()),
  };

  return {
    build: {
      rollupOptions: {
        input: htmlInputs,
      },
    },
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
