import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      // Static AI-generated assets served by Express — must be proxied in dev mode
      '/covers': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/backgrounds': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/music': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/tts': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    }
  }
});
