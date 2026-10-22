import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = env.VITE_API_URL || 'http://localhost:8001';
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8000';

  return {
    build: {
      rollupOptions: {
        input: {
          main: resolve(process.cwd(), 'index.html'),
          pdfTutor: resolve(process.cwd(), 'pdf-tutor.html'),
          teacherDashboard: resolve(process.cwd(), 'teacher/index.html'),
          chemistry: resolve(process.cwd(), 'chemistry.html'),
          biologyLab: resolve(process.cwd(), 'biology-lab.html'),
          career: resolve(process.cwd(), 'career.html'),
        },
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
