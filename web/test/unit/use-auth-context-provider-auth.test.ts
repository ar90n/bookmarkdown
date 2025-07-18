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

  describe('OAuth Callback Handling', () => {
    it('should handle OAuth callback with code', async () => {
      mockLocation.search = '?code=test-code&state=test-state';
      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'oauth_state') return 'test-state';
        return null;
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          access_token: 'new-token',
          refresh_token: 'new-refresh',
          expires_in: 3600 
        })
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });

      expect(mockConfig.onOAuthSuccess).toHaveBeenCalled();
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('oauth_state');
    });

    it('should handle OAuth error in callback', async () => {
      mockLocation.search = '?error=access_denied&error_description=User+denied+access';

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await waitFor(() => {
        expect(result.current.error).toBe('OAuth error: User denied access');
      });

      expect(mockConfig.onOAuthError).toHaveBeenCalledWith('User denied access');
    });

    it('should handle state mismatch in OAuth callback', async () => {
      mockLocation.search = '?code=test-code&state=wrong-state';
      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'oauth_state') return 'test-state';
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid state parameter');
      });

      expect(mockConfig.onOAuthError).toHaveBeenCalledWith('Invalid state parameter');
    });
  });

  describe('Login Operations', () => {
    it('should login with token successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await act(async () => {
        await result.current.loginWithToken('test-token');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();

      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify(mockUser));
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_tokens', 
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
        await result.current.loginWithToken('invalid-token');
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe('Failed to fetch user: 401 Unauthorized');
    });

    it('should handle network error during login', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await act(async () => {
        await result.current.loginWithToken('test-token');
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe('Failed to fetch user: Network error');
    });
  });

  describe('OAuth Login', () => {
    it('should initiate OAuth login', () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      act(() => {
        result.current.loginWithOAuth();
      });

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('oauth_state', expect.any(String));
      expect(global.open).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/login/oauth/authorize'),
        'github-oauth',
        expect.any(String)
      );
    });

    it('should include all required OAuth parameters', () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      act(() => {
        result.current.loginWithOAuth();
      });

      const openCall = (global.open as any).mock.calls[0];
      const url = openCall[0];

      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(url).toContain('scope=repo%20gist');
      expect(url).toContain('state=');
    });

    it('should handle window.open failure', () => {
      (global.open as any).mockReturnValueOnce(null);

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      act(() => {
        result.current.loginWithOAuth();
      });

      expect(result.current.error).toBe('Failed to open OAuth window. Please check your popup blocker.');
    });
  });

  describe('Logout', () => {
    it('should logout and clear all data', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_tokens');
    });
  });
});