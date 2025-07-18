import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '../test-utils';
import { useAuthContextProvider } from '../../src/lib/context/providers/useAuthContextProvider';
import { AuthConfig, GitHubUser, AuthTokens } from '../../src/lib/context/AuthContext';

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

// Mock window.open
global.open = vi.fn();

describe('useAuthContextProvider - Core', () => {
  const mockConfig: AuthConfig = {
    clientId: 'test-client-id',
    scope: 'repo gist',
    redirectUri: 'http://localhost:3000/callback',
    onOAuthSuccess: vi.fn(),
    onOAuthError: vi.fn()
  };

  const mockUser: GitHubUser = {
    login: 'testuser',
    id: 12345,
    avatar_url: 'https://github.com/testuser.png',
    name: 'Test User',
    email: 'test@example.com'
  };

  const mockTokens: AuthTokens = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: Date.now() + 3600000 // 1 hour from now
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
    mockLocation.href = 'http://localhost:3000/test';
    mockLocation.search = '';
    mockLocation.pathname = '/test';
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    // Unmount all rendered hooks
    renderedHooks.forEach(hook => hook.unmount());
    renderedHooks.length = 0;
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with no user and not authenticated', () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load user from localStorage on init', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle invalid stored data gracefully', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return 'invalid json';
        if (key === 'auth_tokens') return 'invalid json';
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should clear auth if tokens are expired on init', () => {
      const expiredTokens = { ...mockTokens, expiresAt: Date.now() - 1000 };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(expiredTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_tokens');
    });
  });

  describe('Error Management', () => {
    it('should handle errors in state', () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      act(() => {
        result.current.setError('Test error message');
      });

      expect(result.current.error).toBe('Test error message');
    });

    it('should clear errors', () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Reset Auth', () => {
    it('should reset all auth state', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.resetAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_tokens');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('oauth_state');
    });
  });
});