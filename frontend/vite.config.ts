import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cpSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const directory = fileURLToPath(new URL('.', import.meta.url));
const localBackend = process.env.HASKE_API_ORIGIN || 'http://localhost:8000';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'haske-brand-assets',
      apply: 'build',
      closeBundle() {
        const destination = resolve(directory, 'dist/assets');
        mkdirSync(destination, { recursive: true });
        cpSync(resolve(directory, '../assets'), destination, { recursive: true });
      },
    },
    {
      name: 'haske-local-brand-assets',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const pathname = (request.url || '').split('?')[0];
          if (!/^\/assets\/[A-Za-z0-9_-]+\.webp$/.test(pathname)) return next();
          const file = resolve(directory, '..', pathname.slice(1));
          if (!existsSync(file)) return next();
          response.setHeader('Content-Type', 'image/webp');
          response.end(readFileSync(file));
        });
      },
    },
  ],
  server: {
    proxy: {
      '/api': {
        target: localBackend,
        changeOrigin: true,
        configure(proxy) {
          // Local Vite proxy only. Production clients call public /api paths.
          proxy.on('proxyReq', request => request.setHeader('Origin', localBackend));
        },
      },
    },
  },
});
