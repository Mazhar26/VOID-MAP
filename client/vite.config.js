import { defineConfig } from 'vite';

export default defineConfig({
  // Proxy /api calls to Express in development.
  // This avoids CORS issues — the browser thinks everything is on port 5173.
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // During build, output to dist/ (disable sourcemap for production security)
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
