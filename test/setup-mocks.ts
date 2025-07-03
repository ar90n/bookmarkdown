/*
 * Global test mocks setup
 */

import { vi } from 'vitest';

// Mock the AppProvider context hooks globally
const createMockAuthContext = (overrides = {}) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  tokens: null,
  lastLoginAt: null,
  login: vi.fn(),
  logout: vi.fn(),
  refreshAuth: vi.fn(),
  loginWithOAuth: vi.fn(),
  ...overrides,
});

const createMockBookmarkContext = (overrides = {}) => ({
  bookmarks: { version: 1 as const, categories: [] },
  isLoading: false,
  error: null,
  isDirty: false,
  loadBookmarks: vi.fn(),
  saveBookmarks: vi.fn(),
  sync: vi.fn(),
  addCategory: vi.fn(),
  updateCategory: vi.fn(),
  removeCategory: vi.fn(),
  addBundle: vi.fn(),
  updateBundle: vi.fn(),
  removeBundle: vi.fn(),
  addBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  removeBookmark: vi.fn(),
  searchBookmarks: vi.fn(),
  exportToMarkdown: vi.fn(),
  importFromMarkdown: vi.fn(),
  ...overrides,
});

// Mock the AppProvider module
vi.mock('../../web/src/contexts/AppProvider', () => {
  let mockAuthValue = createMockAuthContext();
  let mockBookmarkValue = createMockBookmarkContext();
  
  return {
    useAppContext: () => ({
      auth: mockAuthValue,
      bookmark: mockBookmarkValue,
      initialize: vi.fn(),
    }),
    useAuthContext: () => mockAuthValue,
    useBookmarkContext: () => mockBookmarkValue,
    AppProvider: ({ children }: { children: React.ReactNode }) => children,
    
    // Test utilities to update mock values
    __setMockAuthValue: (value: any) => { mockAuthValue = { ...mockAuthValue, ...value }; },
    __setMockBookmarkValue: (value: any) => { mockBookmarkValue = { ...mockBookmarkValue, ...value }; },
    __resetMocks: () => {
      mockAuthValue = createMockAuthContext();
      mockBookmarkValue = createMockBookmarkContext();
    },
  };
});