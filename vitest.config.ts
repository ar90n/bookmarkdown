import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'bookmarkdown': path.resolve(__dirname, './dist/browser')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts', './test/setup-react.ts', './test/setup-mocks.ts'],
    include: [
      'test/**/*.test.ts',
      'test/**/*.test.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'web/**/*.test.ts',
      'web/**/*.test.tsx'
    ],
    exclude: ['node_modules', 'dist', 'extension'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'extension/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        '**/main.tsx'
      ]
    }
  }
});