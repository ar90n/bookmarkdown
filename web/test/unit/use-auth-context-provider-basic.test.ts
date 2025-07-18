import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '../test-utils';
import { useAuthContextProvider } from '../../src/lib/context/providers/useAuthContextProvider';
import { GitHubUser, AuthTokens } from '../../src/lib/context/AuthContext';

// Mock fetch globally
global.fetch = vi.fn();

// Mock crypto.getRandomValues
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    })
  }
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock window.location
const mockLocation = {
  href: '',
  search: '',
  pathname: '/test',
  origin: 'http://localhost:3000',
  reload: vi.fn(),
  replace: vi.fn()
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock window.history
const mockHistory = {
  replaceState: vi.fn()
};
Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true
});

describe('useAuthContextProvider - Basic Tests', () => {
  const mockUser: GitHubUser = {
    id: 123,
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
    html_url: 'https://github.com/testuser',
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  };

  const mockTokens: AuthTokens = {
    accessToken: 'test-token',
    scopes: ['gist'],
    expiresAt: undefined
  };

  const renderedHooks: Array<{ unmount: () => void }> = [];

  const renderHookWithCleanup = <T,>(callback: () => T) => {
    const result = renderHook(callback);
    renderedHooks.push(result);
    return result;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/test';
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    // Unmount all rendered hooks
    renderedHooks.forEach(hook => hook.unmount());
    renderedHooks.length = 0;
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  describe('Authentication State', () => {
    it('should initialize with unauthenticated state', () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider({
        clientId: 'test-client',
        scope: 'gist',
        redirectUri: 'http://localhost:3000/callback',
        onOAuthSuccess: vi.fn(),
        onOAuthError: vi.fn()
      }));

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should restore auth state from localStorage', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider({
        clientId: 'test-client',
        scope: 'gist',
        redirectUri: 'http://localhost:3000/callback',
        onOAuthSuccess: vi.fn(),
        onOAuthError: vi.fn()
      }));

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('Basic Operations', () => {
    it('should set and clear errors', () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider({
        clientId: 'test-client',
        scope: 'gist',
        redirectUri: 'http://localhost:3000/callback',
        onOAuthSuccess: vi.fn(),
        onOAuthError: vi.fn()
      }));

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should update user information', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider({
        clientId: 'test-client',
        scope: 'gist',
        redirectUri: 'http://localhost:3000/callback',
        onOAuthSuccess: vi.fn(),
        onOAuthError: vi.fn()
      }));

      const updatedUser = { ...mockUser, name: 'Updated Name' };

      act(() => {
        result.current.updateUser(updatedUser);
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify(updatedUser));
    });
  });

  describe('Token Operations', () => {
    it('should get access token when authenticated', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider({
        clientId: 'test-client',
        scope: 'gist',
        redirectUri: 'http://localhost:3000/callback',
        onOAuthSuccess: vi.fn(),
        onOAuthError: vi.fn()
      }));

      const token = await result.current.getValidToken();

      expect(token).toBe('test-token');
    });

    it('should return null token when not authenticated', async () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider({
        clientId: 'test-client',
        scope: 'gist',
        redirectUri: 'http://localhost:3000/callback',
        onOAuthSuccess: vi.fn(),
        onOAuthError: vi.fn()
      }));

      const token = await result.current.getValidToken();

      expect(token).toBeNull();
    });
  });

  describe('Logout', () => {
    it('should clear all auth data on logout', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider({
        clientId: 'test-client',
        scope: 'gist',
        redirectUri: 'http://localhost:3000/callback',
        onOAuthSuccess: vi.fn(),
        onOAuthError: vi.fn()
      }));

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_tokens');
    });
  });
});