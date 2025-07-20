// Test setup file
// This file runs before all tests

import { beforeEach } from 'vitest';

// Reset any global state before each test
beforeEach(() => {
  // Reset any mocks or global state here
});

// Global test utilities
export const createMockBookmark = (overrides = {}) => ({
  id: 'test-id',
  title: 'Test Bookmark',
  url: 'https://example.com',
  tags: ['test'],
  notes: 'Test notes',
  ...overrides
});

export const createMockBundle = (overrides = {}) => ({
  name: 'Test Bundle',
  bookmarks: [],
  ...overrides
});

export const createMockCategory = (overrides = {}) => ({
  name: 'Test Category',
  bundles: [],
  ...overrides
});

export const createMockRoot = (overrides = {}) => ({
  version: 1 as const,
  categories: [],
  ...overrides
});