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
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        maxForks: 1
      }
    },
    testTimeout: 30000,
    include: [
      'test/**/*.test.ts',
      'test/**/*.test.tsx',
      'web/src/lib/**/*.test.ts',
      'web/src/lib/**/*.test.tsx',
      'web/**/*.test.ts',
      'web/**/*.test.tsx'
    ],
    exclude: [
      'node_modules', 
      'dist', 
      'extension',
      // Exclude deleted duplicate files
      'test/core/utils/async-operation.test.ts',
      'test/core/utils/entityHelpers.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'cobertura'],
      include: [
        'web/src/**/*.{ts,tsx}',
        'src/**/*.{ts,tsx}'
      ],
      exclude: [
        'node_modules/',
        'dist/',
        'extension/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        '**/main.tsx',
        '**/*.test.{ts,tsx}',
        '**/setup*.ts',
        'web/src/App.tsx',
        'web/src/vite-env.d.ts'
      ]
    }
  }
});