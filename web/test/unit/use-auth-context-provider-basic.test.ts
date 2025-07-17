import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/test';
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAuthContextProvider({}));
    
    expect(result.current.user).toBe(null);
    expect(result.current.tokens).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.lastLoginAt).toBe(null);
  });

  it('should load auth data from localStorage', async () => {
    const storedData = {
      user: mockUser,
      tokens: mockTokens,
      lastLoginAt: new Date().toISOString()
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
    
    const { result } = renderHook(() => useAuthContextProvider({}));
    
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it('should login with valid token', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'X-OAuth-Scopes': 'gist' })
      } as Response);
    
    const { result } = renderHook(() => useAuthContextProvider({}));
    
    await act(async () => {
      await result.current.login('valid-token');
    });
    
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.tokens?.accessToken).toBe('valid-token');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should handle invalid token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401
    } as Response);
    
    const { result } = renderHook(() => useAuthContextProvider({}));
    
    await act(async () => {
      await result.current.login('invalid-token');
    });
    
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe('Invalid or expired token');
  });

  it('should logout successfully', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      user: mockUser,
      tokens: mockTokens,
      lastLoginAt: new Date().toISOString()
    }));
    
    const { result } = renderHook(() => useAuthContextProvider({}));
    
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
    
    await act(async () => {
      await result.current.logout();
    });
    
    expect(result.current.user).toBe(null);
    expect(result.current.tokens).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('bookmark_auth');
  });

  it('should validate token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser
    } as Response);
    
    const { result } = renderHook(() => useAuthContextProvider({}));
    
    const isValid = await result.current.validateToken('test-token');
    
    expect(isValid).toBe(true);
  });

  it('should handle OAuth callback', async () => {
    const authData = btoa(JSON.stringify({ user: mockUser, tokens: mockTokens }));
    const state = 'test-state';
    
    sessionStorageMock.getItem.mockReturnValue(state);
    mockLocation.search = `?auth=${authData}&state=${state}`;
    
    const { result } = renderHook(() => useAuthContextProvider({}));
    
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it('should initiate OAuth login', async () => {
    const oauthServiceUrl = 'https://oauth.example.com';
    const { result } = renderHook(() => useAuthContextProvider({ oauthServiceUrl }));
    
    await act(async () => {
      await result.current.loginWithOAuth();
    });
    
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('oauth_state', expect.any(String));
    expect(mockLocation.href).toContain(`${oauthServiceUrl}/auth/github`);
  });

  it('should set and clear errors', () => {
    const { result } = renderHook(() => useAuthContextProvider({}));
    
    act(() => {
      result.current.setError('Test error');
    });
    
    expect(result.current.error).toBe('Test error');
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBe(null);
  });

  it('should reset auth state', () => {
    const { result } = renderHook(() => useAuthContextProvider({}));
    
    act(() => {
      result.current.resetAuth();
    });
    
    expect(result.current.user).toBe(null);
    expect(result.current.tokens).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });
});