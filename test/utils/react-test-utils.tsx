/*
 * React Testing Utilities
 * Provides common test helpers and mock providers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock implementations for contexts
export const createMockAuthContext = (overrides = {}) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  refreshAuth: vi.fn(),
  ...overrides,
});

export const createMockBookmarkContext = (overrides = {}) => ({
  bookmarks: { version: 1 as const, categories: [] },
  loading: false,
  error: null,
  dirty: false,
  loadBookmarks: vi.fn(),
  saveBookmarks: vi.fn(),
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

// Mock Context Providers
export const MockAuthProvider: React.FC<{ 
  children: React.ReactNode; 
  value?: any 
}> = ({ children, value = createMockAuthContext() }) => {
  const AuthContext = React.createContext(value);
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const MockBookmarkProvider: React.FC<{ 
  children: React.ReactNode; 
  value?: any 
}> = ({ children, value = createMockBookmarkContext() }) => {
  const BookmarkContext = React.createContext(value);
  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
};

// Create mock for the actual AppProvider hooks
const createMockAppContext = (authValue?: any, bookmarkValue?: any) => ({
  auth: authValue || createMockAuthContext(),
  bookmark: bookmarkValue || createMockBookmarkContext(),
  initialize: vi.fn(),
});

// Mock the specific AppProvider context
const MockAppContext = React.createContext(null as any);

export const MockAppProvider: React.FC<{
  children: React.ReactNode;
  authValue?: any;
  bookmarkValue?: any;
}> = ({ children, authValue, bookmarkValue }) => {
  const appContextValue = createMockAppContext(authValue, bookmarkValue);
  
  return (
    <BrowserRouter>
      <MockAppContext.Provider value={appContextValue}>
        {children}
      </MockAppContext.Provider>
    </BrowserRouter>
  );
};

// Mock the useAppContext hook
const mockUseAppContext = () => {
  const context = React.useContext(MockAppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Mock the specific context hooks
const mockUseAuthContext = () => {
  const { auth } = mockUseAppContext();
  return auth;
};

const mockUseBookmarkContext = () => {
  const { bookmark } = mockUseAppContext();
  return bookmark;
};

// Note: AppProvider is mocked globally in setup-mocks.ts

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: any;
  bookmarkValue?: any;
  routerWrapper?: boolean;
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    authValue = createMockAuthContext(),
    bookmarkValue = createMockBookmarkContext(),
    routerWrapper = true,
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (routerWrapper) {
      return (
        <MockAppProvider authValue={authValue} bookmarkValue={bookmarkValue}>
          {children}
        </MockAppProvider>
      );
    }
    
    return (
      <MockAuthProvider value={authValue}>
        <MockBookmarkProvider value={bookmarkValue}>
          {children}
        </MockBookmarkProvider>
      </MockAuthProvider>
    );
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    authValue,
    bookmarkValue,
  };
};

// Custom render for router-less components
export const renderWithoutRouter = (ui: ReactElement, options?: CustomRenderOptions) =>
  renderWithProviders(ui, { ...options, routerWrapper: false });

// Mock data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  login: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://github.com/images/error/testuser_happy.gif',
  html_url: 'https://github.com/testuser',
  ...overrides,
});

export const createMockBookmark = (overrides = {}) => ({
  id: 'bookmark-123',
  title: 'Test Bookmark',
  url: 'https://example.com',
  tags: ['test'],
  notes: 'Test notes',
  ...overrides,
});

export const createMockBundle = (overrides = {}) => ({
  name: 'Test Bundle',
  bookmarks: [createMockBookmark()],
  ...overrides,
});

export const createMockCategory = (overrides = {}) => ({
  name: 'Test Category',
  bundles: [createMockBundle()],
  ...overrides,
});

export const createMockBookmarkData = (overrides = {}) => ({
  version: 1 as const,
  categories: [createMockCategory()],
  ...overrides,
});

export const createMockRoot = (overrides = {}) => ({
  version: 1 as const,
  categories: [],
  ...overrides,
});

// API Mock helpers
export const mockFetch = (response: any, options: { ok?: boolean; status?: number } = {}) => {
  const { ok = true, status = 200 } = options;
  
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
    headers: new Headers(),
  });
};

export const mockFetchError = (error: string = 'Network error') => {
  return vi.fn().mockRejectedValue(new Error(error));
};

// OAuth mock helpers
export const mockOAuthSuccess = (user = createMockUser()) => ({
  user,
  tokens: {
    accessToken: 'mock-access-token',
    tokenType: 'bearer',
    scope: 'repo,gist',
  },
});

export const mockOAuthError = (error = 'OAuth failed') => ({
  error,
  error_description: 'Mock OAuth error for testing',
});

// Event helpers
export const mockEvent = (overrides = {}) => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  target: { value: '' },
  currentTarget: { value: '' },
  ...overrides,
});

// Async test helpers
export const waitForApiCall = () => new Promise(resolve => setTimeout(resolve, 0));

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));