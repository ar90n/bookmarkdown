import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// Configuration for building the library as UMD/ESM
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/browser.ts'),
      name: 'BookMarkDown',
      fileName: (format) => `bookmarkdown.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    outDir: 'dist/browser',
    sourcemap: true
  },
  plugins: [
    dts({
      outputDir: 'dist/browser',
      insertTypesEntry: true,
    })
  ]
});