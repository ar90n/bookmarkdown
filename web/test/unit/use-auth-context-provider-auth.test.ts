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

describe('useAuthContextProvider - Auth Operations', () => {
  const mockConfig: AuthConfig = {
    oauthServiceUrl: 'http://localhost:8787',
    scopes: ['gist', 'user:email'],
    storageKey: 'test_auth'
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
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    scopes: ['gist']
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

  describe.skip('OAuth Callback Handling', () => {
    it('should handle OAuth callback with auth data', async () => {
      const authResponse = {
        user: mockUser,
        tokens: mockTokens
      };
      const authData = btoa(JSON.stringify(authResponse));
      
      mockLocation.search = `?auth=${authData}&state=test-state`;
      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'oauth_state') return 'test-state';
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      }, { timeout: 1000 });

      // OAuth success is indicated by successful authentication
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('oauth_state');
    });

    it('should handle OAuth error in callback', async () => {
      mockLocation.search = '?error=access_denied&error_description=User+denied+access';

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await waitFor(() => {
        expect(result.current.error).toBe('OAuth error: User denied access');
      }, { timeout: 1000 });

      // OAuth error is indicated by error state
    });

    it('should handle state mismatch in OAuth callback', async () => {
      const authResponse = {
        user: mockUser,
        tokens: mockTokens
      };
      const authData = btoa(JSON.stringify(authResponse));
      
      mockLocation.search = `?auth=${authData}&state=wrong-state`;
      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'oauth_state') return 'test-state';
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await waitFor(() => {
        expect(result.current.error).toBe('OAuth callback error: Invalid OAuth state - possible CSRF attack');
      }, { timeout: 1000 });

      // OAuth error is indicated by error state
    });
  });

  describe('Login Operations', () => {
    it('should login with token successfully', async () => {
      // Mock GET request for user data (validateTokenWithGitHub)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });
      
      // Mock HEAD request for token scopes (checkTokenScopes)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'X-OAuth-Scopes' ? 'gist, user:email' : null
        }
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await act(async () => {
        await result.current.login('test-token');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test_auth',
        expect.stringContaining('"user":')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test_auth',
        expect.stringContaining('"accessToken":"test-token"')
      );
    });

    it('should handle invalid token during login', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await act(async () => {
        await result.current.login('invalid-token');
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe('Invalid or expired token');
    });

    it('should handle network error during login', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await act(async () => {
        await result.current.login('test-token');
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe('Invalid or expired token');
    });
  });

  describe('OAuth Login', () => {
    it('should initiate OAuth login', () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      act(() => {
        result.current.loginWithOAuth();
      });

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('oauth_state', expect.any(String));
      expect(mockLocation.href).toContain('http://localhost:8787/auth/github');
    });

    it('should include all required OAuth parameters', () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      act(() => {
        result.current.loginWithOAuth();
      });

      const url = mockLocation.href;
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Ftest');
      expect(url).toContain('state=');
    });

    it('should handle OAuth service not configured', () => {
      const configNoService = { ...mockConfig, oauthServiceUrl: '' };
      const { result } = renderHookWithCleanup(() => useAuthContextProvider(configNoService));

      act(() => {
        result.current.loginWithOAuth();
      });

      expect(result.current.error).toBe('OAuth service not configured');
    });
  });

  describe('Logout', () => {
    it('should logout and clear all data', async () => {
      const authData = {
        user: mockUser,
        tokens: mockTokens,  
        lastLoginAt: new Date().toISOString()
      };
      
      let callCount = 0;
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'test_auth' && callCount++ === 0) {
          return JSON.stringify(authData);
        }
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test_auth');
    });
  });
});