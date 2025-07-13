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
  
  describe('read', () => {
    it('should read a gist via API', async () => {
      const mockGistResponse = {
        id: 'abc123',
        files: {
          'bookmarks.md': {
            filename: 'bookmarks.md',
            content: '# Test Content\n\nThis is test content.'
          }
        }
      };
      
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'etag': '"read-etag-456"'
        }),
        json: async () => mockGistResponse
      } as Response);
      
      const result = await repository.read('abc123');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('abc123');
        expect(result.data.content).toBe('# Test Content\n\nThis is test content.');
        expect(result.data.etag).toBe('"read-etag-456"');
      }
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/gists/abc123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });
    
    it('should handle 404 errors', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Not Found' })
      } as Response);
      
      const result = await repository.read('non-existent');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Not found');
      }
    });
    
    it('should validate gist id', async () => {
      const result = await repository.read('');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Gist ID is required');
      }
    });
  });
  
  describe('update', () => {
    it('should update a gist with etag validation', async () => {
      const mockGistResponse = {
        id: 'abc123',
        files: {
          'bookmarks.md': {
            filename: 'bookmarks.md',
            content: '# Updated Content'
          }
        }
      };
      
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'etag': '"new-etag-789"'
        }),
        json: async () => mockGistResponse
      } as Response);
      
      const params = {
        gistId: 'abc123',
        content: '# Updated Content',
        etag: '"old-etag-456"',
        description: 'Updated Description'
      };
      
      const result = await repository.update(params);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.etag).toBe('"new-etag-789"');
      }
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/gists/abc123',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'If-Match': '"old-etag-456"'
          }),
          body: expect.stringContaining('"description":"Updated Description"')
        })
      );
    });
    
    it('should handle etag mismatch (412 Precondition Failed)', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 412,
        statusText: 'Precondition Failed',
        json: async () => ({ message: 'Precondition Failed' })
      } as Response);
      
      const params = {
        gistId: 'abc123',
        content: '# Updated Content',
        etag: '"wrong-etag"'
      };
      
      const result = await repository.update(params);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Precondition Failed');
      }
    });
    
    it('should validate parameters', async () => {
      const params = {
        gistId: 'abc123',
        content: '',
        etag: '"some-etag"'
      };
      
      const result = await repository.update(params);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Content is required');
      }
    });
  });
  
  describe('exists', () => {
    it('should return true for existing gist', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response);
      
      const result = await repository.exists('abc123');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/gists/abc123',
        expect.objectContaining({
          method: 'HEAD'
        })
      );
    });
    
    it('should return false for non-existent gist', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);
      
      const result = await repository.exists('non-existent');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });
  
  describe('findByFilename', () => {
    it('should find gist by filename', async () => {
      const mockFetch = vi.mocked(global.fetch);
      
      // Mock list gists response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: 'gist1',
            files: { 'other.md': {} }
          },
          {
            id: 'gist2',
            files: { 'bookmarks.md': {} }
          }
        ]
      } as Response);
      
      // Mock read gist response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'etag': '"found-etag"' }),
        json: async () => ({
          id: 'gist2',
          files: {
            'bookmarks.md': {
              content: '# Found Content'
            }
          }
        })
      } as Response);
      
      const result = await repository.findByFilename('bookmarks.md');
      
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe('gist2');
        expect(result.data.content).toBe('# Found Content');
      }
    });
    
    it('should return null when file not found', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      } as Response);
      
      const result = await repository.findByFilename('not-found.md');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });
  
  describe('getCommits', () => {
    it('should get commit history', async () => {
      const mockCommits = [
        {
          version: 'abc123',
          committed_at: '2024-01-01T00:00:00Z',
          change_status: {
            additions: 10,
            deletions: 5,
            total: 15
          }
        }
      ];
      
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommits
      } as Response);
      
      const result = await repository.getCommits('gist123');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].version).toBe('abc123');
        expect(result.data[0].committedAt).toBe('2024-01-01T00:00:00Z');
        expect(result.data[0].changeStatus.additions).toBe(10);
      }
    });
  });
});