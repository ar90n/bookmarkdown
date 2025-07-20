import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, renameSync, rmdirSync } from 'fs';

// Configuration for building the Chrome extension
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        'popup': resolve(__dirname, 'extension/popup.html'),
        'newtab': resolve(__dirname, 'extension/newtab.html'),
        'background': resolve(__dirname, 'extension/background.js'),
        'content': resolve(__dirname, 'extension/content.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Place HTML files in root
          if (assetInfo.name?.endsWith('.html')) {
            return '[name][extname]';
          }
          if (assetInfo.name?.endsWith('.css')) {
            return 'styles/[name][extname]';
          }
          return 'assets/[name][extname]';
        }
      }
    },
    outDir: 'dist/extension',
    emptyOutDir: true,
  },
  publicDir: false,
  plugins: [
    {
      name: 'copy-extension-files',
      writeBundle() {
        const outDir = resolve(__dirname, 'dist/extension');
        
        // Copy manifest.json
        try {
          copyFileSync(
            resolve(__dirname, 'extension/manifest.json'),
            resolve(outDir, 'manifest.json')
          );
          console.log('✓ Copied manifest.json');
        } catch (error) {
          console.error('Failed to copy manifest.json:', error);
        }
        
        // Copy popup.js
        try {
          copyFileSync(
            resolve(__dirname, 'extension/popup.js'),
            resolve(outDir, 'popup.js')
          );
          console.log('✓ Copied popup.js');
        } catch (error) {
          console.error('Failed to copy popup.js:', error);
        }
        
        // Copy icons directory
        const iconsDir = resolve(__dirname, 'extension/icons');
        const targetIconsDir = resolve(outDir, 'icons');
        try {
          mkdirSync(targetIconsDir, { recursive: true });
          const files = readdirSync(iconsDir);
          files.forEach(file => {
            if (file.endsWith('.png')) {
              copyFileSync(
                resolve(iconsDir, file),
                resolve(targetIconsDir, file)
              );
            }
          });
          console.log('✓ Copied icons');
        } catch (error) {
          console.error('Failed to copy icons:', error);
        }
        
        // Move HTML files from subdirectory to root
        try {
          const htmlSubDir = resolve(outDir, 'extension');
          const htmlFiles = ['popup.html', 'newtab.html'];
          htmlFiles.forEach(file => {
            try {
              renameSync(
                resolve(htmlSubDir, file),
                resolve(outDir, file)
              );
              console.log(`✓ Moved ${file} to root`);
            } catch (err) {
              console.error(`Failed to move ${file}:`, err);
            }
          });
          // Remove empty subdirectory
          try {
            rmdirSync(htmlSubDir);
            console.log('✓ Cleaned up empty subdirectory');
          } catch (err) {
            // Ignore if directory doesn't exist or is not empty
          }
        } catch (error) {
          console.error('Failed to move HTML files:', error);
        }
      }
    }
  ]
});