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

describe('useAuthContextProvider - Token Management', () => {
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
    vi.useFakeTimers();
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
    vi.useRealTimers();
  });

  describe('Token Validation', () => {
    it('should validate non-expired token', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const isValid = await result.current.validateToken();

      expect(isValid).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should invalidate expired token', async () => {
      const expiredTokens = { ...mockTokens, expiresAt: Date.now() - 1000 };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(expiredTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const isValid = await result.current.validateToken();

      expect(isValid).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should validate token with API when no expiry', async () => {
      const tokensNoExpiry = { accessToken: 'test-token' };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(tokensNoExpiry);
        return null;
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const isValid = await result.current.validateToken();

      expect(isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token',
            'Accept': 'application/vnd.github.v3+json'
          }
        })
      );
    });

    it('should handle API validation failure', async () => {
      const tokensNoExpiry = { accessToken: 'invalid-token' };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(tokensNoExpiry);
        return null;
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const isValid = await result.current.validateToken();

      expect(isValid).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Get Valid Token', () => {
    it('should return valid token immediately', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const token = await result.current.getValidToken();

      expect(token).toBe('test-access-token');
    });

    it('should refresh expired token if refresh token exists', async () => {
      const expiredTokens = { 
        ...mockTokens, 
        expiresAt: Date.now() - 1000,
        refreshToken: 'test-refresh-token'
      };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(expiredTokens);
        return null;
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        })
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const token = await result.current.getValidToken();

      expect(token).toBe('new-access-token');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/token'),
        expect.any(Object)
      );
    });

    it('should return null if no valid token and no refresh', async () => {
      const expiredTokens = { 
        ...mockTokens, 
        expiresAt: Date.now() - 1000,
        refreshToken: undefined
      };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(expiredTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const token = await result.current.getValidToken();

      expect(token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Refresh Auth', () => {
    it('should refresh auth successfully with valid token', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      const updatedUser = { ...mockUser, name: 'Updated User' };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedUser
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await act(async () => {
        await result.current.refreshAuth();
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_user',
        JSON.stringify(updatedUser)
      );
    });

    it('should handle refresh failure', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await act(async () => {
        await result.current.refreshAuth();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should refresh with new token using refresh token', async () => {
      const expiredTokens = { 
        ...mockTokens, 
        expiresAt: Date.now() - 1000,
        refreshToken: 'test-refresh-token'
      };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(expiredTokens);
        return null;
      });

      // Mock token refresh
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        })
      });

      // Mock user fetch with new token
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      await act(async () => {
        await result.current.refreshAuth();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('Update User', () => {
    it('should update user in state and storage', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_tokens') return JSON.stringify(mockTokens);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const updatedUser = { ...mockUser, name: 'New Name' };

      act(() => {
        result.current.updateUser(updatedUser);
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_user',
        JSON.stringify(updatedUser)
      );
    });

    it('should not update if not authenticated', () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const updatedUser = { ...mockUser, name: 'New Name' };

      act(() => {
        result.current.updateUser(updatedUser);
      });

      expect(result.current.user).toBeNull();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
});