import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const previewHost = process.env.CODESPACE_NAME
  ? `${process.env.CODESPACE_NAME}-5173.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? 'app.github.dev'}`
  : null;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: previewHost ? [previewHost] : [],
  },
  build: { rollupOptions: { output: { manualChunks: { three: ['three'] } } } },
});
