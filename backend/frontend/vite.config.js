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
    amplifyTutor: resolve(process.cwd(), 'amplify-tutor.html'),
    biologyLab: resolve(process.cwd(), 'biology-lab.html'),
    career: resolve(process.cwd(), 'career.html'),
    chemistry: resolve(process.cwd(), 'chemistry.html'),
    classroom: resolve(process.cwd(), 'classroom.html'),
    classroomai: resolve(process.cwd(), 'classroomai.html'),
    dashboard: resolve(process.cwd(), 'dashboard.html'),
    deeplearn: resolve(process.cwd(), 'deeplearn.html'),
    einstein: resolve(process.cwd(), 'einstein.html'),
    experiments: resolve(process.cwd(), 'experiments.html'),
    pdfTutor: resolve(process.cwd(), 'pdf-tutor.html'),
    quiz: resolve(process.cwd(), 'quiz.html'),
    routine: resolve(process.cwd(), 'routine.html'),
    teacherDashboard: resolve(process.cwd(), 'teacher/index.html'),
    teacherClassroom: resolve(process.cwd(), 'teacher/classroom.html'),
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
