import { Result } from '../types/result.js';

export interface GitHubUser {
  readonly id: number;
  readonly login: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly avatar_url: string;
  readonly html_url: string;
}

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAt?: Date;
  readonly scopes: readonly string[];
}

export interface AuthContextState {
  readonly user: GitHubUser | null;
  readonly tokens: AuthTokens | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly lastLoginAt: Date | null;
}

export interface AuthContextValue extends AuthContextState {
  // Authentication operations
  login: (token?: string) => Promise<Result<GitHubUser>>;
  loginWithOAuth: () => Promise<Result<GitHubUser>>;
  logout: () => Promise<Result<void>>;
  refreshAuth: () => Promise<Result<GitHubUser>>;
  
  // Token management
  validateToken: (token?: string) => Promise<Result<GitHubUser>>;
  getValidToken: () => Promise<string | null>;
  
  // User operations
  updateUser: () => Promise<Result<GitHubUser>>;
  
  // State management
  setError: (error: string | null) => void;
  clearError: () => void;
  resetAuth: () => void;
}

export interface AuthContextActions {
  setUser: (user: GitHubUser | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastLoginAt: (date: Date | null) => void;
}

export interface AuthConfig {
  readonly clientId?: string;
  readonly redirectUri?: string;
  readonly scopes?: readonly string[];
  readonly storageKey?: string;
  readonly oauthServiceUrl?: string; // Cloudflare Worker OAuth service URL
}

export const createAuthContextValue = (
  config: AuthConfig,
  state: AuthContextState,
  actions: AuthContextActions
): AuthContextValue => {
  
  const GITHUB_API_BASE = 'https://api.github.com';
  const STORAGE_KEY = config.storageKey || 'bookmark_auth';

  // Helper function to generate random state for OAuth
  const generateRandomState = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  // Helper function to handle OAuth callback
  const handleOAuthCallback = async (): Promise<Result<AuthTokens & { user: GitHubUser }>> => {
    if (typeof window === 'undefined') {
      return { success: false, error: new Error('OAuth callback only available in browser') };
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authData = urlParams.get('auth');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        return { success: false, error: new Error(`OAuth error: ${error}`) };
      }

      if (!authData || !state) {
        return { success: false, error: new Error('Missing OAuth callback data') };
      }

      // Validate state
      const storedState = sessionStorage.getItem('oauth_state');
      if (state !== storedState) {
        return { success: false, error: new Error('Invalid OAuth state - possible CSRF attack') };
      }

      // Clean up
      sessionStorage.removeItem('oauth_state');
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Parse auth data
      const authResponse = JSON.parse(atob(authData));
      
      return { 
        success: true, 
        data: {
          user: authResponse.user,
          ...authResponse.tokens
        }
      };
    } catch (error) {
      return {
        success: false,
        error: new Error(`OAuth callback processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      };
    }
  };

  const withAsyncOperation = async <T>(
    operation: () => Promise<Result<T>>,
    onSuccess?: (data: T) => void
  ): Promise<Result<T>> => {
    actions.setLoading(true);
    actions.setError(null);
    
    try {
      const result = await operation();
      
      if (result.success) {
        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        actions.setError(result.error.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication error';
      actions.setError(errorMessage);
      return { success: false, error: new Error(errorMessage) } as Result<T>;
    } finally {
      actions.setLoading(false);
    }
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

  const validateTokenWithGitHub = async (token: string): Promise<Result<GitHubUser>> => {
    try {
      const response = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'BookMarkDown/1.0.0'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: new Error('Invalid or expired token') };
        }
        return { success: false, error: new Error(`GitHub API error: ${response.statusText}`) };
      }

      const userData = await response.json() as GitHubUser;
      return { success: true, data: userData };
    } catch (error) {
      return { 
        success: false, 
        error: new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`) 
      };
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

  // Initialize auth state from stored data or OAuth callback
  const initializeAuth = async () => {
    // Check for OAuth callback or OAuth error
    if (typeof window !== 'undefined' && (window.location.search.includes('auth=') || window.location.search.includes('error='))) {
      // Handle OAuth error first
      if (window.location.search.includes('error=')) {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        const errorMessage = errorDescription || error || 'OAuth authentication failed';
        actions.setError(`OAuth error: ${errorMessage}`);
        return;
      }
      
      // Handle OAuth success callback
      try {
        const callbackResult = await handleOAuthCallback();
        if (callbackResult.success) {
          const { user, ...tokens } = callbackResult.data;
          
          actions.setUser(user);
          actions.setTokens(tokens);
          actions.setLastLoginAt(new Date());
          
          saveAuthData(user, tokens);
          return;
        } else {
          actions.setError(callbackResult.error.message);
        }
      } catch (error) {
        actions.setError(`OAuth callback error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Load from stored data if no OAuth callback
    const authData = loadAuthData();
    if (authData) {
      actions.setUser(authData.user);
      actions.setTokens(authData.tokens);
      actions.setLastLoginAt(authData.lastLoginAt);
    }
  };

  // Call initialization
  if (typeof window !== 'undefined') {
    initializeAuth();
  }

  return {
    // State
    ...state,

    // Authentication operations
    login: async (token?: string) => {
      if (!token) {
        return { success: false, error: new Error('Token is required') };
      }

      return withAsyncOperation(
        async () => {
          const userResult = await validateTokenWithGitHub(token);
          if (!userResult.success) {
            return userResult;
          }

          const scopes = await checkTokenScopes(token);
          const tokens: AuthTokens = {
            accessToken: token,
            scopes,
            expiresAt: undefined // Personal access tokens don't expire automatically
          };

          actions.setUser(userResult.data);
          actions.setTokens(tokens);
          actions.setLastLoginAt(new Date());
          
          saveAuthData(userResult.data, tokens);

          return userResult;
        }
      );
    },

    loginWithOAuth: async () => {
      return withAsyncOperation(
        async () => {
          if (!config.oauthServiceUrl) {
            return { 
              success: false, 
              error: new Error('OAuth service not configured') 
            };
          }

          if (typeof window === 'undefined') {
            return { 
              success: false, 
              error: new Error('OAuth only available in browser environment') 
            };
          }

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
            
            // This will never actually return as we redirect
            return { success: false, error: new Error('Redirecting to OAuth service') };
          } catch (error) {
            return {
              success: false,
              error: new Error(`OAuth initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
            };
          }
        }
      );
    },

    logout: async () => {
      return withAsyncOperation(
        async () => {
          actions.setUser(null);
          actions.setTokens(null);
          actions.setLastLoginAt(null);
          clearAuthData();
          
          return { success: true, data: undefined };
        }
      );
    },

    refreshAuth: async () => {
      return withAsyncOperation(
        async () => {
          if (!state.tokens?.accessToken) {
            return { success: false, error: new Error('No token to refresh') };
          }

          const userResult = await validateTokenWithGitHub(state.tokens.accessToken);
          if (userResult.success) {
            actions.setUser(userResult.data);
            actions.setLastLoginAt(new Date());
            
            if (state.tokens) {
              saveAuthData(userResult.data, state.tokens);
            }
          }

          return userResult;
        }
      );
    },

    // Token management
    validateToken: async (token?: string) => {
      const tokenToValidate = token || state.tokens?.accessToken;
      if (!tokenToValidate) {
        return { success: false, error: new Error('No token to validate') };
      }

      return validateTokenWithGitHub(tokenToValidate);
    },

    getValidToken: async (): Promise<string | null> => {
      if (!state.tokens?.accessToken) {
        return null;
      }

      // Check if token is still valid
      const validationResult = await validateTokenWithGitHub(state.tokens.accessToken);
      if (validationResult.success) {
        return state.tokens.accessToken;
      }

      // Token is invalid, clear auth state
      actions.setUser(null);
      actions.setTokens(null);
      clearAuthData();
      
      return null;
    },

    // User operations
    updateUser: async () => {
      return withAsyncOperation(
        async () => {
          if (!state.tokens?.accessToken) {
            return { success: false, error: new Error('Not authenticated') };
          }

          const userResult = await validateTokenWithGitHub(state.tokens.accessToken);
          if (userResult.success) {
            actions.setUser(userResult.data);
            
            if (state.tokens) {
              saveAuthData(userResult.data, state.tokens);
            }
          }

          return userResult;
        }
      );
    },

    // State management
    setError: (error: string | null) => actions.setError(error),
    clearError: () => actions.setError(null),
    resetAuth: () => {
      actions.setUser(null);
      actions.setTokens(null);
      actions.setError(null);
      actions.setLoading(false);
      actions.setLastLoginAt(null);
      clearAuthData();
    }
  };
};