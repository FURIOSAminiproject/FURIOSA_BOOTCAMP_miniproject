import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

export default defineConfig(({ mode }) => {
  const selectedMode = mode === 'op' ? 'production' : (mode === 'localdev' ? 'local' : mode);
  if (!['local', 'development', 'production'].includes(selectedMode)) throw new Error('Unsupported environment');
  const envFile = path.resolve(process.cwd(), '.env.' + selectedMode);
  const env = { ...(existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}), ...process.env };
  const enableTls = env.ENABLE_TLS === 'true';
  const defaultBackend = enableTls ? 'https://127.0.0.1:3001' : 'http://127.0.0.1:3001';
  const proxy = {
    '/fastapi': { target: env.FASTAPI_URL || 'http://127.0.0.1:8000', changeOrigin: true, rewrite: (url: string) => url.replace(/^\/fastapi/, '') },
    '/api': {
      target: env.BACKEND_URL || defaultBackend,
      changeOrigin: true,
      secure: false,
    },
    '/auth': {
      target: env.BACKEND_URL || defaultBackend,
      changeOrigin: true,
      secure: false,
    },
  };
  return {
    envDir: false,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    preview: { proxy },
    server: {
      proxy,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
