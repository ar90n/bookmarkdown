/**
 * Custom error classes for specific error types
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Common error messages
 */
export const ErrorMessages = {
  GENERIC: 'An unexpected error occurred',
  NETWORK: 'Network error. Please check your connection and try again.',
  AUTH_REQUIRED: 'Authentication required',
  AUTH_EXPIRED: 'Your session has expired. Please sign in again.',
  API_ERROR: 'Failed to communicate with the server',
  VALIDATION_FAILED: 'Please check your input and try again',
  NOT_FOUND: 'The requested resource was not found',
  CONFLICT: 'A conflict occurred. Please refresh and try again.',
  EXTENSION_NOT_ACTIVE: 'Chrome extension is not active. Please make sure the extension is installed and enabled.',
} as const;

/**
 * Error handler options
 */
export interface ErrorHandlerOptions {
  fallbackMessage?: string;
  logLevel?: 'error' | 'warn' | 'info';
  rethrow?: boolean;
  showToast?: boolean;
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown, fallback?: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback || ErrorMessages.GENERIC;
}

/**
 * Handle errors with consistent logging and formatting
 */
export function handleError(
  error: unknown,
  context: string,
  options: ErrorHandlerOptions = {}
): string {
  const message = getErrorMessage(error, options.fallbackMessage);
  const formattedMessage = `${context}: ${message}`;
  
  // Log the error
  const logLevel = options.logLevel || 'error';
  console[logLevel](formattedMessage, error);
  
  // Rethrow if requested
  if (options.rethrow) {
    throw error;
  }
  
  return message;
}

/**
 * Type guard for API errors
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard for validation errors
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard for authentication errors
 */
export function isAuthError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError ||
    (error instanceof Error && 
     (error.message.toLowerCase().includes('auth') ||
      error.message.toLowerCase().includes('token')));
}

/**
 * Type guard for network errors
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError ||
    (error instanceof Error && 
     (error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('fetch')));
}

/**
 * Handle API response errors
 */
export async function handleApiResponse(response: Response): Promise<any> {
  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    let errorData;
    
    try {
      errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Response body is not JSON or empty
    }
    
    throw new ApiError(errorMessage, response.status, errorData);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text();
}

/**
 * Create a retry wrapper for operations that might fail temporarily
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000, shouldRetry } = options;
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      if (shouldRetry && !shouldRetry(error, attempt)) {
        throw error;
      }
      
      // Default retry logic: retry on network errors
      if (!shouldRetry && !isNetworkError(error)) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: unknown): string {
  if (isAuthError(error)) {
    return ErrorMessages.AUTH_REQUIRED;
  }
  
  if (isNetworkError(error)) {
    return ErrorMessages.NETWORK;
  }
  
  if (isApiError(error)) {
    if (error.status === 404) {
      return ErrorMessages.NOT_FOUND;
    }
    if (error.status === 409) {
      return ErrorMessages.CONFLICT;
    }
    if (error.status === 401 || error.status === 403) {
      return ErrorMessages.AUTH_EXPIRED;
    }
  }
  
  if (isValidationError(error)) {
    return error.message;
  }
  
  return getErrorMessage(error, ErrorMessages.GENERIC);
}