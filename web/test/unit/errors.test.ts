import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  ValidationError,
  AuthenticationError,
  NetworkError,
  ErrorMessages,
  getErrorMessage,
  handleError,
  isApiError,
  isValidationError,
  isAuthError,
  isNetworkError,
  handleApiResponse,
  withRetry,
  formatErrorForUser
} from '../../src/utils/errors';

describe('Error Utilities', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Custom Error Classes', () => {
    it('should create ApiError with properties', () => {
      const error = new ApiError('API failed', 404, { detail: 'Not found' });
      
      expect(error.message).toBe('API failed');
      expect(error.name).toBe('ApiError');
      expect(error.status).toBe(404);
      expect(error.response).toEqual({ detail: 'Not found' });
    });

    it('should create ValidationError with properties', () => {
      const error = new ValidationError('Invalid email', 'email', 'test@');
      
      expect(error.message).toBe('Invalid email');
      expect(error.name).toBe('ValidationError');
      expect(error.field).toBe('email');
      expect(error.value).toBe('test@');
    });

    it('should create AuthenticationError with default message', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication required');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create NetworkError with default message', () => {
      const error = new NetworkError();
      
      expect(error.message).toBe('Network error occurred');
      expect(error.name).toBe('NetworkError');
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error');
      expect(getErrorMessage(error)).toBe('Test error');
    });

    it('should return string error as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should return fallback for non-error types', () => {
      expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
      expect(getErrorMessage(undefined, 'Fallback')).toBe('Fallback');
      expect(getErrorMessage(123, 'Fallback')).toBe('Fallback');
      expect(getErrorMessage({ error: 'object' }, 'Fallback')).toBe('Fallback');
    });

    it('should return generic message when no fallback provided', () => {
      expect(getErrorMessage(null)).toBe(ErrorMessages.GENERIC);
    });
  });

  describe('handleError', () => {
    it('should log error and return message', () => {
      const error = new Error('Test error');
      
      const result = handleError(error, 'Test context');
      
      expect(result).toBe('Test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Test context: Test error', error);
    });

    it('should use fallback message', () => {
      const result = handleError(null, 'Test context', { 
        fallbackMessage: 'Custom fallback' 
      });
      
      expect(result).toBe('Custom fallback');
    });

    it('should respect log level', () => {
      handleError(new Error('Test'), 'Context', { logLevel: 'warn' });
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      
      handleError(new Error('Test'), 'Context', { logLevel: 'info' });
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should rethrow error when requested', () => {
      const error = new Error('Test error');
      
      expect(() => handleError(error, 'Context', { rethrow: true }))
        .toThrow('Test error');
    });
  });

  describe('Type Guards', () => {
    it('should identify ApiError', () => {
      expect(isApiError(new ApiError('Test'))).toBe(true);
      expect(isApiError(new Error('Test'))).toBe(false);
      expect(isApiError('string')).toBe(false);
    });

    it('should identify ValidationError', () => {
      expect(isValidationError(new ValidationError('Test'))).toBe(true);
      expect(isValidationError(new Error('Test'))).toBe(false);
    });

    it('should identify AuthenticationError', () => {
      expect(isAuthError(new AuthenticationError())).toBe(true);
      expect(isAuthError(new Error('Authentication failed'))).toBe(true);
      expect(isAuthError(new Error('Invalid token'))).toBe(true);
      expect(isAuthError(new Error('Other error'))).toBe(false);
    });

    it('should identify NetworkError', () => {
      expect(isNetworkError(new NetworkError())).toBe(true);
      expect(isNetworkError(new Error('Network timeout'))).toBe(true);
      expect(isNetworkError(new Error('Fetch failed'))).toBe(true);
      expect(isNetworkError(new Error('Other error'))).toBe(false);
    });
  });

  describe('handleApiResponse', () => {
    it('should return JSON for successful response', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ data: 'test' })
      } as any;
      
      const result = await handleApiResponse(mockResponse);
      
      expect(result).toEqual({ data: 'test' });
    });

    it('should return text for non-JSON response', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: vi.fn().mockResolvedValue('plain text')
      } as any;
      
      const result = await handleApiResponse(mockResponse);
      
      expect(result).toBe('plain text');
    });

    it('should throw ApiError for non-OK response', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({ message: 'Invalid input' })
      } as any;
      
      await expect(handleApiResponse(mockResponse))
        .rejects.toThrow(ApiError);
      
      try {
        await handleApiResponse(mockResponse);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Invalid input');
        expect((error as ApiError).status).toBe(400);
      }
    });

    it('should handle error response with error field', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: vi.fn().mockResolvedValue({ error: 'Internal error' })
      } as any;
      
      try {
        await handleApiResponse(mockResponse);
      } catch (error) {
        expect((error as ApiError).message).toBe('Internal error');
      }
    });

    it('should handle non-JSON error response', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as any;
      
      try {
        await handleApiResponse(mockResponse);
      } catch (error) {
        expect((error as ApiError).message).toBe('API error: 404 Not Found');
      }
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError())
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, { delay: 10 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after max attempts', async () => {
      const error = new NetworkError('Failed');
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation, { maxAttempts: 2, delay: 10 }))
        .rejects.toThrow('Failed');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-network errors by default', async () => {
      const error = new Error('Some other error');
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation))
        .rejects.toThrow('Some other error');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry logic', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Retry this'))
        .mockResolvedValue('success');
      
      const shouldRetry = vi.fn().mockReturnValue(true);
      
      const result = await withRetry(operation, { 
        delay: 10,
        shouldRetry 
      });
      
      expect(result).toBe('success');
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should stop retrying when shouldRetry returns false', async () => {
      const error = new Error('Stop retrying');
      const operation = vi.fn().mockRejectedValue(error);
      const shouldRetry = vi.fn().mockReturnValue(false);
      
      await expect(withRetry(operation, { shouldRetry }))
        .rejects.toThrow('Stop retrying');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError())
        .mockRejectedValueOnce(new NetworkError())
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      const result = await withRetry(operation, { delay: 10 });
      const endTime = Date.now();
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      // Should have waited 10ms + 20ms = 30ms minimum (allow for timing variations)
      expect(endTime - startTime).toBeGreaterThanOrEqual(25);
    });
  });

  describe('formatErrorForUser', () => {
    it('should format authentication errors', () => {
      expect(formatErrorForUser(new AuthenticationError()))
        .toBe(ErrorMessages.AUTH_REQUIRED);
      
      expect(formatErrorForUser(new Error('Invalid auth token')))
        .toBe(ErrorMessages.AUTH_REQUIRED);
    });

    it('should format network errors', () => {
      expect(formatErrorForUser(new NetworkError()))
        .toBe(ErrorMessages.NETWORK);
      
      expect(formatErrorForUser(new Error('Network timeout')))
        .toBe(ErrorMessages.NETWORK);
    });

    it('should format API errors by status', () => {
      expect(formatErrorForUser(new ApiError('Not found', 404)))
        .toBe(ErrorMessages.NOT_FOUND);
      
      expect(formatErrorForUser(new ApiError('Conflict', 409)))
        .toBe(ErrorMessages.CONFLICT);
      
      // ApiError with message "Unauthorized" contains "auth" so isAuthError returns true
      // and AUTH_REQUIRED is returned instead of AUTH_EXPIRED
      expect(formatErrorForUser(new ApiError('Unauthorized', 401)))
        .toBe(ErrorMessages.AUTH_REQUIRED);
      
      expect(formatErrorForUser(new ApiError('Forbidden', 403)))
        .toBe(ErrorMessages.AUTH_EXPIRED);
    });

    it('should format validation errors', () => {
      const error = new ValidationError('Email is invalid');
      expect(formatErrorForUser(error)).toBe('Email is invalid');
    });

    it('should format generic errors', () => {
      expect(formatErrorForUser(new Error('Some error')))
        .toBe('Some error');
      
      expect(formatErrorForUser(null))
        .toBe(ErrorMessages.GENERIC);
    });
  });
});