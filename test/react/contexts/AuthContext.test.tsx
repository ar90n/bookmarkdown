/*
 * AuthContext Tests
 * Tests for authentication context functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  createAuthContextValue, 
  AuthConfig, 
  AuthContextState, 
  AuthContextActions,
  GitHubUser,
  AuthTokens
} from '../../../src/context/AuthContext';
import { 
  mockFetch, 
  mockFetchError, 
  createMockUser,
  mockOAuthSuccess,
  mockOAuthError 
} from '../../utils/react-test-utils';

describe('AuthContext', () => {
  let mockConfig: AuthConfig;
  let mockState: AuthContextState;
  let mockActions: AuthContextActions;
  let mockUser: GitHubUser;
  let mockTokens: AuthTokens;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '',
        assign: vi.fn(),
        reload: vi.fn(),
        replace: vi.fn(),
      },
      writable: true,
    });

    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
      },
      writable: true,
    });

    // Create mock data
    mockUser = createMockUser();
    mockTokens = {
      accessToken: 'mock-token',
      scopes: ['gist', 'user:email'],
    };

    mockConfig = {
      clientId: 'mock-client-id',
      redirectUri: 'http://localhost:3000',
      scopes: ['gist', 'user:email'],
      storageKey: 'test_auth',
      oauthServiceUrl: 'https://oauth.example.com',
    };

    mockState = {
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastLoginAt: null,
    };

    mockActions = {
      setUser: vi.fn(),
      setTokens: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setLastLoginAt: vi.fn(),
    };

    // Mock global fetch
    global.fetch = mockFetch(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login with token', () => {
    it('should successfully login with valid token', async () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);
      global.fetch = mockFetch(mockUser);

      const result = await authContext.login('valid-token');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockActions.setLoading).toHaveBeenCalledWith(true);
      expect(mockActions.setLoading).toHaveBeenCalledWith(false);
      expect(mockActions.setUser).toHaveBeenCalledWith(mockUser);
      expect(mockActions.setTokens).toHaveBeenCalled();
      expect(mockActions.setError).toHaveBeenCalledWith(null);
    });

    it('should fail login with invalid token', async () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);
      global.fetch = mockFetch({}, { ok: false, status: 401 });

      const result = await authContext.login('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Invalid or expired token');
      expect(mockActions.setLoading).toHaveBeenCalledWith(true);
      expect(mockActions.setLoading).toHaveBeenCalledWith(false);
      expect(mockActions.setError).toHaveBeenCalled();
    });

    it('should fail login without token', async () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      const result = await authContext.login();

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Token is required');
    });

    it('should handle network errors', async () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);
      global.fetch = mockFetchError('Network error');

      const result = await authContext.login('valid-token');

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Network error');
      expect(mockActions.setError).toHaveBeenCalled();
    });
  });

  describe('OAuth login', () => {
    it('should initiate OAuth flow', async () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);
      
      const result = await authContext.loginWithOAuth();

      expect(window.location.href).toContain('oauth.example.com/auth/github');
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('oauth_state', expect.any(String));
      expect(result.success).toBe(false); // Because it redirects
      expect(result.error.message).toBe('Redirecting to OAuth service');
    });

    it('should fail OAuth without service URL', async () => {
      const configWithoutOAuth = { ...mockConfig, oauthServiceUrl: undefined };
      const authContext = createAuthContextValue(configWithoutOAuth, mockState, mockActions);

      const result = await authContext.loginWithOAuth();

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('OAuth service not configured');
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      const stateWithUser = { ...mockState, user: mockUser, tokens: mockTokens, isAuthenticated: true };
      const authContext = createAuthContextValue(mockConfig, stateWithUser, mockActions);

      const result = await authContext.logout();

      expect(result.success).toBe(true);
      expect(mockActions.setUser).toHaveBeenCalledWith(null);
      expect(mockActions.setTokens).toHaveBeenCalledWith(null);
      expect(mockActions.setLastLoginAt).toHaveBeenCalledWith(null);
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('test_auth');
    });
  });

  describe('token validation', () => {
    it('should validate existing token', async () => {
      const stateWithTokens = { ...mockState, tokens: mockTokens };
      const authContext = createAuthContextValue(mockConfig, stateWithTokens, mockActions);
      global.fetch = mockFetch(mockUser);

      const result = await authContext.validateToken();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should validate provided token', async () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);
      global.fetch = mockFetch(mockUser);

      const result = await authContext.validateToken('new-token');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should fail validation without token', async () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      const result = await authContext.validateToken();

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('No token to validate');
    });
  });

  describe('getValidToken', () => {
    it('should return valid token', async () => {
      const stateWithTokens = { ...mockState, tokens: mockTokens };
      const authContext = createAuthContextValue(mockConfig, stateWithTokens, mockActions);
      global.fetch = mockFetch(mockUser);

      const token = await authContext.getValidToken();

      expect(token).toBe('mock-token');
    });

    it('should return null for invalid token', async () => {
      const stateWithTokens = { ...mockState, tokens: mockTokens };
      const authContext = createAuthContextValue(mockConfig, stateWithTokens, mockActions);
      global.fetch = mockFetch({}, { ok: false, status: 401 });

      const token = await authContext.getValidToken();

      expect(token).toBeNull();
      expect(mockActions.setUser).toHaveBeenCalledWith(null);
      expect(mockActions.setTokens).toHaveBeenCalledWith(null);
    });

    it('should return null without tokens', async () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      const token = await authContext.getValidToken();

      expect(token).toBeNull();
    });
  });

  describe('refreshAuth', () => {
    it('should refresh authentication', async () => {
      const stateWithUser = { ...mockState, user: mockUser, tokens: mockTokens };
      const authContext = createAuthContextValue(mockConfig, stateWithUser, mockActions);
      global.fetch = mockFetch(mockUser);

      const result = await authContext.refreshAuth();

      expect(result.success).toBe(true);
      expect(mockActions.setUser).toHaveBeenCalledWith(mockUser);
      expect(mockActions.setLastLoginAt).toHaveBeenCalled();
    });

    it('should fail refresh without token', async () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      const result = await authContext.refreshAuth();

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('No token to refresh');
    });
  });

  describe('updateUser', () => {
    it('should update user information', async () => {
      const stateWithTokens = { ...mockState, tokens: mockTokens };
      const authContext = createAuthContextValue(mockConfig, stateWithTokens, mockActions);
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      global.fetch = mockFetch(updatedUser);

      const result = await authContext.updateUser();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
      expect(mockActions.setUser).toHaveBeenCalledWith(updatedUser);
    });

    it('should fail update without authentication', async () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      const result = await authContext.updateUser();

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Not authenticated');
    });
  });

  describe('state management', () => {
    it('should set error', () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      authContext.setError('Test error');

      expect(mockActions.setError).toHaveBeenCalledWith('Test error');
    });

    it('should clear error', () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      authContext.clearError();

      expect(mockActions.setError).toHaveBeenCalledWith(null);
    });

    it('should reset auth state', () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      authContext.resetAuth();

      expect(mockActions.setUser).toHaveBeenCalledWith(null);
      expect(mockActions.setTokens).toHaveBeenCalledWith(null);
      expect(mockActions.setError).toHaveBeenCalledWith(null);
      expect(mockActions.setLoading).toHaveBeenCalledWith(false);
      expect(mockActions.setLastLoginAt).toHaveBeenCalledWith(null);
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('test_auth');
    });
  });

  describe('OAuth callback handling', () => {
    it('should handle successful OAuth callback', async () => {
      const authData = btoa(JSON.stringify(mockOAuthSuccess()));
      const state = 'test-state';
      
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          search: `?auth=${authData}&state=${state}`,
        },
        writable: true,
      });

      window.sessionStorage.getItem = vi.fn().mockReturnValue(state);

      // Creating the context should trigger OAuth callback handling
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('oauth_state');
      expect(window.history.replaceState).toHaveBeenCalled();
    });

    it('should handle OAuth callback with invalid state', async () => {
      const authData = btoa(JSON.stringify(mockOAuthSuccess()));
      
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          search: `?auth=${authData}&state=invalid-state`,
        },
        writable: true,
      });

      window.sessionStorage.getItem = vi.fn().mockReturnValue('valid-state');

      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockActions.setError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid OAuth state')
      );
    });

    it('should handle OAuth callback error', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          search: '?error=access_denied&error_description=User denied access',
        },
        writable: true,
      });

      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      // Wait for async initialization - OAuth error handling happens during initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // The error should be handled during OAuth callback processing
      expect(mockActions.setError).toHaveBeenCalled();
      const errorCalls = mockActions.setError.mock.calls;
      
      // Check for either the specific OAuth error format we expect
      const hasOAuthError = errorCalls.some(call => 
        call[0] && typeof call[0] === 'string' && 
        (call[0].includes('OAuth error: access_denied') || call[0].includes('OAuth error: User denied access'))
      );
      expect(hasOAuthError).toBe(true);
    });
  });

  describe('localStorage integration', () => {
    it('should save auth data to localStorage', async () => {
      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);
      global.fetch = mockFetch(mockUser);

      await authContext.login('valid-token');

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'test_auth',
        expect.stringContaining(JSON.stringify(mockUser).slice(1, -1)) // Check if user data is in the stored JSON
      );
    });

    it('should load auth data from localStorage on initialization', () => {
      const authData = {
        user: mockUser,
        tokens: mockTokens,
        lastLoginAt: new Date().toISOString(),
      };

      window.localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(authData));

      const authContext = createAuthContextValue(mockConfig, mockState, mockActions);

      expect(mockActions.setUser).toHaveBeenCalledWith(mockUser);
      expect(mockActions.setTokens).toHaveBeenCalledWith(mockTokens);
      expect(mockActions.setLastLoginAt).toHaveBeenCalled();
    });

    it('should handle corrupt localStorage data gracefully', () => {
      window.localStorage.getItem = vi.fn().mockReturnValue('invalid-json');
      
      // Should not throw error
      expect(() => {
        createAuthContextValue(mockConfig, mockState, mockActions);
      }).not.toThrow();
    });
  });
});