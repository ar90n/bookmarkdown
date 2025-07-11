// Result type removed - Context layer is imperative

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

export interface AuthContextValue {
  // State
  readonly user: GitHubUser | null;
  readonly tokens: AuthTokens | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly lastLoginAt: Date | null;
  
  // Authentication operations
  login: (token?: string) => Promise<void>;
  loginWithOAuth: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  
  // Token management
  validateToken: (token?: string) => Promise<boolean>;
  getValidToken: () => Promise<string | null>;
  
  // User operations
  updateUser: () => Promise<void>;
  
  // State management
  setError: (error: string | null) => void;
  clearError: () => void;
  resetAuth: () => void;
}

export interface AuthConfig {
  readonly clientId?: string;
  readonly redirectUri?: string;
  readonly scopes?: readonly string[];
  readonly storageKey?: string;
  readonly oauthServiceUrl: string;
}

// Factory function removed - use useAuthContextProvider hook instead