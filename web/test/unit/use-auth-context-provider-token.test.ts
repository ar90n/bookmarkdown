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
      const authData = {
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'test_auth') return JSON.stringify(authData);
        return null;
      });

      // Mock the validateToken API call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const isValid = await result.current.validateToken();

      expect(isValid).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should invalidate expired token', async () => {
      const expiredTokens = { ...mockTokens, expiresAt: new Date(Date.now() - 1000) };
      
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
      
      const authData = {
        user: mockUser,
        tokens: tokensNoExpiry,
        lastLoginAt: new Date().toISOString()
      };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'test_auth') return JSON.stringify(authData);
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
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'BookMarkDown/1.0.0'
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
      const authData = {
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'test_auth') return JSON.stringify(authData);
        return null;
      });

      // Mock the validateToken API call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const token = await result.current.getValidToken();

      expect(token).toBe('test-access-token');
    });

    it('should return null for expired token even with refresh token', async () => {
      const expiredTokens = { 
        ...mockTokens, 
        expiresAt: new Date(Date.now() - 1000),
        refreshToken: 'test-refresh-token'
      };
      
      const authData = {
        user: mockUser,
        tokens: expiredTokens,
        lastLoginAt: new Date().toISOString()
      };
      
      let callCount = 0;
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'test_auth' && callCount++ === 0) {
          return JSON.stringify(authData);
        }
        return null;
      });

      // Mock the validateToken API call - expired token returns null
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      let token: string | null = null;
      await act(async () => {
        token = await result.current.getValidToken();
      });

      expect(token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return null if no valid token and no refresh', async () => {
      const expiredTokens = { 
        ...mockTokens, 
        expiresAt: new Date(Date.now() - 1000),
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
      const authData = {
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'test_auth') return JSON.stringify(authData);
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
        'test_auth',
        expect.stringContaining('"user":')
      );
    });

    it('should handle refresh failure', async () => {
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

    // Refresh tokens are not currently supported in the implementation
  });

  describe('Update User', () => {
    it('should update user in state and storage', async () => {
      const authData = {
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'test_auth') return JSON.stringify(authData);
        return null;
      });

      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const updatedUser = { ...mockUser, name: 'New Name' };

      // Mock the API call to fetch updated user info
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedUser
      });

      await act(async () => {
        await result.current.updateUser();
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test_auth',
        expect.stringContaining('"user":')
      );
    });

    it('should not update if not authenticated', async () => {
      const { result } = renderHookWithCleanup(() => useAuthContextProvider(mockConfig));

      const updatedUser = { ...mockUser, name: 'New Name' };

      await act(async () => {
        await result.current.updateUser();
      });

      expect(result.current.user).toBeNull();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
});