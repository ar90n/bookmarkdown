import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

// Configuration for building the Chrome extension
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'extension/popup.html'),
        newtab: resolve(__dirname, 'extension/newtab.html'),
        background: resolve(__dirname, 'extension/background.js'),
      },
      output: {
        entryFileNames: 'scripts/[name].js',
        chunkFileNames: 'scripts/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'styles/[name][extname]';
          }
          if (assetInfo.name?.endsWith('.html')) {
            return '[name][extname]';
          }
          return 'assets/[name][extname]';
        }
      }
    },
    outDir: 'dist/extension',
    emptyOutDir: true,
  },
  publicDir: resolve(__dirname, 'extension/icons'),
  plugins: [
    {
      name: 'copy-manifest',
      writeBundle() {
        // Copy manifest.json to the output directory
        try {
          copyFileSync(
            resolve(__dirname, 'extension/manifest.json'),
            resolve(__dirname, 'dist/extension/manifest.json')
          );
          console.log('✓ Copied manifest.json');
        } catch (error) {
          console.error('Failed to copy manifest.json:', error);
        }
      }
    }
  ]
});