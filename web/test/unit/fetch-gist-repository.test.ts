import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FetchGistRepository } from '../../src/lib/repositories/fetch-gist-repository.js';
import type { GistRepository } from '../../src/lib/repositories/gist-repository.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('FetchGistRepository', () => {
  let repository: GistRepository;
  const mockAccessToken = 'test-token';
  const mockFilename = 'bookmarks.md';
  
  beforeEach(() => {
    vi.clearAllMocks();
    repository = new FetchGistRepository({
      accessToken: mockAccessToken,
      filename: mockFilename
    });
  });
  
  describe('constructor', () => {
    it('should create instance with required config', () => {
      expect(repository).toBeDefined();
      expect(repository.create).toBeDefined();
      expect(repository.read).toBeDefined();
      expect(repository.update).toBeDefined();
      expect(repository.exists).toBeDefined();
      expect(repository.findByFilename).toBeDefined();
      expect(repository.getCommits).toBeDefined();
    });
    
    it('should validate access token', () => {
      expect(() => {
        new FetchGistRepository({
          accessToken: '',
          filename: 'test.md'
        });
      }).toThrow('Access token is required');
    });
    
    it('should validate filename', () => {
      expect(() => {
        new FetchGistRepository({
          accessToken: 'token',
          filename: ''
        });
      }).toThrow('Filename is required');
    });
    
    it('should use default API base URL', () => {
      const repo = new FetchGistRepository({
        accessToken: 'token',
        filename: 'test.md'
      });
      expect(repo).toBeDefined();
    });
    
    it('should accept custom API base URL', () => {
      const repo = new FetchGistRepository({
        accessToken: 'token',
        filename: 'test.md',
        apiBaseUrl: 'https://custom.github.com/api/v3'
      });
      expect(repo).toBeDefined();
    });
  });
  
  describe('create', () => {
    it('should create a new gist via API', async () => {
      const mockGistResponse = {
        id: 'abc123',
        files: {
          'bookmarks.md': {
            filename: 'bookmarks.md',
            content: '# Test Content'
          }
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({
          'etag': '"mock-etag-123"'
        }),
        json: async () => mockGistResponse
      } as Response);
      
      const params = {
        description: 'Test Gist',
        content: '# Test Content',
        filename: mockFilename,
        isPublic: false
      };
      
      const result = await repository.create(params);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('abc123');
        expect(result.data.etag).toBe('"mock-etag-123"');
      }
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/gists',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"description":"Test Gist"')
        })
      );
    });
    
    it('should handle API errors', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Bad credentials' })
      } as Response);
      
      const params = {
        description: 'Test Gist',
        content: '# Test Content',
        filename: mockFilename
      };
      
      const result = await repository.create(params);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Authentication failed');
        expect(result.error.message).toContain('Bad credentials');
      }
    });
    
    it('should handle network errors', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const params = {
        description: 'Test Gist',
        content: '# Test Content',
        filename: mockFilename
      };
      
      const result = await repository.create(params);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Network error');
      }
    });
    
    it('should validate parameters', async () => {
      const params = {
        description: 'Test Gist',
        content: '',
        filename: mockFilename
      };
      
      const result = await repository.create(params);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Content is required');
      }
    });
  });
});