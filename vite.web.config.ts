import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

// Configuration for building the React SPA
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'web'),
  build: {
    outDir: resolve(__dirname, 'dist/web'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'web/index.html'),
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  css: {
    postcss: './postcss.config.js'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'web/src'),
      'bookmarkdown': resolve(__dirname, 'src')
    }
  }
});