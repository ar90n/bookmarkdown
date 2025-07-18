import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
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

// Mock window.history
const mockHistory = {
  replaceState: vi.fn()
};
Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true
});

describe('useAuthContextProvider', () => {
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

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      expect(result.current.user).toBe(null);
      expect(result.current.tokens).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastLoginAt).toBe(null);
    });

    it('should load auth data from localStorage on init', async () => {
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
        expect(result.current.lastLoginAt).toBeInstanceOf(Date);
      });
    });

    it('should handle corrupted localStorage data', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.user).toBe(null);
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('should use custom storage key', () => {
      const customKey = 'custom_auth_key';
      renderHook(() => useAuthContextProvider({ storageKey: customKey }));
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(customKey);
    });
  });

  describe('OAuth Callback Handling', () => {
    it('should handle OAuth callback with valid auth data', async () => {
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
      
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('oauth_state');
      expect(mockHistory.replaceState).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle OAuth error', async () => {
      mockLocation.search = '?error=access_denied&error_description=User denied access';
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.error).toContain('OAuth error: User denied access');
      });
      
      expect(mockHistory.replaceState).toHaveBeenCalled();
    });

    it('should reject invalid OAuth state (CSRF protection)', async () => {
      const authData = btoa(JSON.stringify({ user: mockUser, tokens: mockTokens }));
      
      sessionStorageMock.getItem.mockReturnValue('stored-state');
      mockLocation.search = `?auth=${authData}&state=different-state`;
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.error).toContain('Invalid OAuth state');
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('should handle malformed auth data', async () => {
      mockLocation.search = '?auth=invalid-base64&state=test';
      sessionStorageMock.getItem.mockReturnValue('test');
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.error).toContain('OAuth callback error');
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe('Login Operations', () => {
    it('should login with valid token', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUser
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'X-OAuth-Scopes': 'gist, repo' })
        } as Response);
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await act(async () => {
        await result.current.login('valid-token');
      });
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens?.accessToken).toBe('valid-token');
      expect(result.current.tokens?.scopes).toEqual(['gist', 'repo']);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBe(null);
      expect(localStorageMock.setItem).toHaveBeenCalled();
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

    it('should handle missing token', async () => {
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await act(async () => {
        await result.current.login();
      });
      
      expect(result.current.error).toBe('Token is required');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await act(async () => {
        await result.current.login('test-token');
      });
      
      expect(result.current.error).toBe('Authentication failed');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set loading state during login', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockUser
        } as Response), 100))
      );
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      const loginPromise = act(async () => {
        await result.current.login('test-token');
      });
      
      expect(result.current.isLoading).toBe(true);
      
      await loginPromise;
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('OAuth Login', () => {
    it('should initiate OAuth login', async () => {
      const oauthServiceUrl = 'https://oauth.example.com';
      const { result } = renderHook(() => useAuthContextProvider({ oauthServiceUrl }));
      
      await act(async () => {
        await result.current.loginWithOAuth();
      });
      
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('oauth_state', expect.any(String));
      expect(mockLocation.href).toContain(`${oauthServiceUrl}/auth/github`);
      expect(mockLocation.href).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Ftest');
      expect(mockLocation.href).toContain('state=');
    });

    it('should handle missing OAuth service URL', async () => {
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await act(async () => {
        await result.current.loginWithOAuth();
      });
      
      expect(result.current.error).toBe('OAuth service not configured');
      expect(mockLocation.href).toBe('http://localhost:3000/test');
    });

    it('should handle OAuth initialization errors', async () => {
      sessionStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const { result } = renderHook(() => useAuthContextProvider({ 
        oauthServiceUrl: 'https://oauth.example.com' 
      }));
      
      await act(async () => {
        await result.current.loginWithOAuth();
      });
      
      expect(result.current.error).toContain('OAuth initialization failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Logout', () => {
    it('should clear all auth data on logout', async () => {
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
      expect(result.current.lastLoginAt).toBe(null);
      expect(result.current.error).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bookmark_auth');
    });
  });

  describe('Token Validation', () => {
    it('should validate a valid token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      } as Response);
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      const isValid = await result.current.validateToken('test-token');
      
      expect(isValid).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should invalidate an invalid token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false
      } as Response);
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      const isValid = await result.current.validateToken('invalid-token');
      
      expect(isValid).toBe(false);
    });

    it('should validate current token if no token provided', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      }));
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      } as Response);
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      const isValid = await result.current.validateToken();
      
      expect(isValid).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should return false if no token available', async () => {
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      const isValid = await result.current.validateToken();
      
      expect(isValid).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Get Valid Token', () => {
    it('should return valid token', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      }));
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      } as Response);
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      const token = await result.current.getValidToken();
      
      expect(token).toBe('test-token');
    });

    it('should logout and return null for invalid token', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      }));
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false
      } as Response);
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      const token = await result.current.getValidToken();
      
      expect(token).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('should return null if not authenticated', async () => {
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      const token = await result.current.getValidToken();
      
      expect(token).toBe(null);
    });
  });

  describe('Refresh Auth', () => {
    it('should refresh auth with valid token', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      }));
      
      const updatedUser = { ...mockUser, name: 'Updated User' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedUser
      } as Response);
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      await act(async () => {
        await result.current.refreshAuth();
      });
      
      expect(result.current.user).toEqual(updatedUser);
      expect(result.current.lastLoginAt).toBeInstanceOf(Date);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should logout on refresh with invalid token', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      }));
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false
      } as Response);
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      await act(async () => {
        await result.current.refreshAuth();
      });
      
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Token expired or revoked');
    });

    it('should handle no token on refresh', async () => {
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await act(async () => {
        await result.current.refreshAuth();
      });
      
      expect(result.current.error).toBe('No token to refresh');
    });
  });

  describe('Update User', () => {
    it('should update user data', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      }));
      
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedUser
      } as Response);
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      await act(async () => {
        await result.current.updateUser();
      });
      
      expect(result.current.user).toEqual(updatedUser);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle update user failure', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      }));
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false
      } as Response);
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      await act(async () => {
        await result.current.updateUser();
      });
      
      expect(result.current.error).toBe('Failed to update user data');
    });

    it('should require authentication to update user', async () => {
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await act(async () => {
        await result.current.updateUser();
      });
      
      expect(result.current.error).toBe('Not authenticated');
    });
  });

  describe('Error Management', () => {
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
  });

  describe('Reset Auth', () => {
    it('should reset all auth state', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString()
      }));
      
      const { result } = renderHook(() => useAuthContextProvider({}));
      
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      act(() => {
        result.current.resetAuth();
      });
      
      expect(result.current.user).toBe(null);
      expect(result.current.tokens).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.lastLoginAt).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bookmark_auth');
    });
  });
});