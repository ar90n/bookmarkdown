import { useState, useCallback, useEffect } from 'react';
import { AuthContextValue, AuthConfig, GitHubUser, AuthTokens } from '../AuthContext.js';

const GITHUB_API_BASE = 'https://api.github.com';

export function useAuthContextProvider(config: AuthConfig): AuthContextValue {
  const STORAGE_KEY = config.storageKey || 'bookmark_auth';
  
  // State management - imperative, mutable
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoginAt, setLastLoginAt] = useState<Date | null>(null);

  // Helper functions
  const generateRandomState = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const saveAuthData = (user: GitHubUser, tokens: AuthTokens) => {
    try {
      const authData = {
        user,
        tokens,
        lastLoginAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    } catch (error) {
      console.warn('Failed to save auth data:', error);
    }
  };

  const loadAuthData = (): { user: GitHubUser; tokens: AuthTokens; lastLoginAt: Date } | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      return {
        user: data.user,
        tokens: data.tokens,
        lastLoginAt: new Date(data.lastLoginAt)
      };
    } catch (error) {
      console.warn('Failed to load auth data:', error);
      return null;
    }
  };

  const clearAuthData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear auth data:', error);
    }
  };

  const validateTokenWithGitHub = async (token: string): Promise<GitHubUser | null> => {
    try {
      const response = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'BookMarkDown/1.0.0'
        }
      });

      if (!response.ok) {
        return null;
      }

      const userData = await response.json() as GitHubUser;
      return userData;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  };

  const checkTokenScopes = async (token: string): Promise<string[]> => {
    try {
      const response = await fetch(`${GITHUB_API_BASE}/user`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const scopesHeader = response.headers.get('X-OAuth-Scopes');
      return scopesHeader ? scopesHeader.split(',').map(s => s.trim()) : [];
    } catch (error) {
      console.warn('Failed to check token scopes:', error);
      return [];
    }
  };

  const handleOAuthCallback = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const authData = urlParams.get('auth');
    const state = urlParams.get('state');
    const oauthError = urlParams.get('error');

    if (!authData && !oauthError) return;

    // Handle OAuth error
    if (oauthError) {
      const errorDescription = urlParams.get('error_description');
      const errorMessage = errorDescription || oauthError || 'OAuth authentication failed';
      setError(`OAuth error: ${errorMessage}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    try {
      // Validate state
      const storedState = sessionStorage.getItem('oauth_state');
      if (state !== storedState) {
        throw new Error('Invalid OAuth state - possible CSRF attack');
      }

      // Clean up
      sessionStorage.removeItem('oauth_state');
      
      // Parse auth data
      const authResponse = JSON.parse(atob(authData!));
      
      // Update state
      setUser(authResponse.user);
      setTokens(authResponse.tokens);
      setLastLoginAt(new Date());
      
      // Save to storage
      saveAuthData(authResponse.user, authResponse.tokens);
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      setError(`OAuth callback error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Handle OAuth callback
    handleOAuthCallback();
    
    // Load stored auth data if no OAuth callback
    const authData = loadAuthData();
    if (authData && !user) {
      setUser(authData.user);
      setTokens(authData.tokens);
      setLastLoginAt(authData.lastLoginAt);
    }
  }, [handleOAuthCallback, user]);

  // Imperative operations - no Result types needed
  const login = useCallback(async (token?: string) => {
    if (!token) {
      setError('Token is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userData = await validateTokenWithGitHub(token);
      if (!userData) {
        setError('Invalid or expired token');
        return;
      }

      const scopes = await checkTokenScopes(token);
      const authTokens: AuthTokens = {
        accessToken: token,
        scopes,
        expiresAt: undefined // Personal access tokens don't expire automatically
      };

      setUser(userData);
      setTokens(authTokens);
      setLastLoginAt(new Date());
      
      saveAuthData(userData, authTokens);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithOAuth = useCallback(async () => {
    if (!config.oauthServiceUrl) {
      setError('OAuth service not configured');
      return;
    }

    if (typeof window === 'undefined') {
      setError('OAuth only available in browser environment');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate state for CSRF protection
      const state = generateRandomState();
      const redirectUri = window.location.origin + window.location.pathname;
      
      // Store state for validation
      sessionStorage.setItem('oauth_state', state);
      
      // Build OAuth URL
      const oauthUrl = new URL(`${config.oauthServiceUrl}/auth/github`);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('state', state);
      
      // Redirect to OAuth service
      window.location.href = oauthUrl.toString();
    } catch (error) {
      setError(`OAuth initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [config.oauthServiceUrl]);

  const logout = useCallback(async () => {
    setUser(null);
    setTokens(null);
    setLastLoginAt(null);
    setError(null);
    clearAuthData();
  }, []);

  const refreshAuth = useCallback(async () => {
    if (!tokens?.accessToken) {
      setError('No token to refresh');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userData = await validateTokenWithGitHub(tokens.accessToken);
      if (userData) {
        setUser(userData);
        setLastLoginAt(new Date());
        saveAuthData(userData, tokens);
      } else {
        // Token is invalid
        await logout();
        setError('Token expired or revoked');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Refresh failed');
    } finally {
      setIsLoading(false);
    }
  }, [tokens, logout]);

  const validateToken = useCallback(async (token?: string): Promise<boolean> => {
    const tokenToValidate = token || tokens?.accessToken;
    if (!tokenToValidate) return false;

    const userData = await validateTokenWithGitHub(tokenToValidate);
    return userData !== null;
  }, [tokens]);

  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (!tokens?.accessToken) return null;

    const isValid = await validateToken(tokens.accessToken);
    if (isValid) {
      return tokens.accessToken;
    }

    // Token is invalid, clear auth state
    await logout();
    return null;
  }, [tokens, validateToken, logout]);

  const updateUser = useCallback(async () => {
    if (!tokens?.accessToken) {
      setError('Not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userData = await validateTokenWithGitHub(tokens.accessToken);
      if (userData) {
        setUser(userData);
        saveAuthData(userData, tokens);
      } else {
        setError('Failed to update user data');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setIsLoading(false);
    }
  }, [tokens]);

  const resetAuth = useCallback(() => {
    setUser(null);
    setTokens(null);
    setError(null);
    setIsLoading(false);
    setLastLoginAt(null);
    clearAuthData();
  }, []);

  return {
    // State
    user,
    tokens,
    isAuthenticated: !!user,
    isLoading,
    error,
    lastLoginAt,
    
    // Operations
    login,
    loginWithOAuth,
    logout,
    refreshAuth,
    validateToken,
    getValidToken,
    updateUser,
    setError,
    clearError: () => setError(null),
    resetAuth
  };
}