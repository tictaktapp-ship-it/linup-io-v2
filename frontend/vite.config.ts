import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Doc 8D Phase 3: Marketing routes pre-rendered at build time for SEO.
// React Router v7 native prerender — no extra packages required.
// /app/* routes are NOT listed here and remain a client-side SPA.

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
});