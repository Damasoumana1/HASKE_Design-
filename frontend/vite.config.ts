import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()], server: { proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true, configure(proxy) { proxy.on('proxyReq', (req) => { req.setHeader('Origin', 'http://localhost:8000'); }); } }, '/assets': { target: 'http://localhost:8000', changeOrigin: true } } } });
