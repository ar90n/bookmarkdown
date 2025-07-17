import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGistClient } from '../../../web/src/lib/shell/gist-io-fetch';
import type { GistConfig } from '../../../web/src/lib/shell/gist-io';

// Mock fetch globally
global.fetch = vi.fn();

describe('Gist IO Fetch', () => {
  const mockConfig: GistConfig = {
    accessToken: 'test-token',
    filename: 'test.md',
    isPublic: false
  };

  let gistClient: ReturnType<typeof createGistClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    gistClient = createGistClient(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchWithAuth helper', () => {
    it('should add proper headers to requests', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'test-id' })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      await gistClient.exists('test-id');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/gists/test-id',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle non-OK responses', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({ message: 'Bad credentials' })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.read('test-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to read gist');
        expect(result.error.message).toContain('Bad credentials');
      }
    });

    it('should handle JSON parse errors in error response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.read('test-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('GitHub API error: 500 Internal Server Error');
      }
    });
  });

  describe('create', () => {
    it('should create a new gist', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'new-gist-id',
          updated_at: '2023-01-01T00:00:00Z'
        })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.create('Test description', 'Test content');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('new-gist-id');
        expect(result.data.updatedAt).toBe('2023-01-01T00:00:00Z');
      }

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/gists',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            description: 'Test description',
            public: false,
            files: {
              'test.md': {
                content: 'Test content'
              }
            }
          })
        })
      );
    });

    it('should use default filename when not specified', async () => {
      const configWithoutFilename = { ...mockConfig, filename: undefined } as any;
      const client = createGistClient(configWithoutFilename);
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'test-id', updated_at: '2023-01-01' })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      await client.create('Test', 'Content');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('bookmarks.md')
        })
      );
    });

    it('should handle create errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const result = await gistClient.create('Test', 'Content');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create gist');
        expect(result.error.message).toContain('Network error');
      }
    });
  });

  describe('read', () => {
    it('should read a gist', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'gist-id',
          updated_at: '2023-01-01T00:00:00Z',
          created_at: '2023-01-01T00:00:00Z',
          files: {
            'test.md': {
              content: 'Test content'
            }
          }
        })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.read('gist-id');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('gist-id');
        expect(result.data.content).toBe('Test content');
        expect(result.data.updatedAt).toBe('2023-01-01T00:00:00Z');
        expect(result.data.createdAt).toBe('2023-01-01T00:00:00Z');
      }
    });

    it('should handle missing file in gist', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'gist-id',
          files: {
            'other.md': { content: 'Other content' }
          }
        })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.read('gist-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("File 'test.md' not found in gist");
      }
    });

    it('should handle missing files object', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'gist-id',
          updated_at: '2023-01-01'
        })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.read('gist-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("File 'test.md' not found in gist");
      }
    });
  });

  describe('update', () => {
    it('should update a gist', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'gist-id',
          updated_at: '2023-01-02T00:00:00Z'
        })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.update('gist-id', 'Updated content', 'Updated description');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('gist-id');
        expect(result.data.updatedAt).toBe('2023-01-02T00:00:00Z');
      }

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/gists/gist-id',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            files: {
              'test.md': {
                content: 'Updated content'
              }
            },
            description: 'Updated description'
          })
        })
      );
    });

    it('should update without description', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'gist-id', updated_at: '2023-01-02' })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      await gistClient.update('gist-id', 'Updated content');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            files: {
              'test.md': {
                content: 'Updated content'
              }
            }
          })
        })
      );
    });

    it('should handle update errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Update failed'));

      const result = await gistClient.update('gist-id', 'Content');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to update gist');
        expect(result.error.message).toContain('Update failed');
      }
    });
  });

  describe('exists', () => {
    it('should return true for existing gist', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'gist-id' })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.exists('gist-id');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should return false for non-existent gist (404)', async () => {
      // Mock fetch to throw an error with 404 in the message
      vi.mocked(global.fetch).mockRejectedValue(new Error('GitHub API error: 404 Not Found'));

      const result = await gistClient.exists('non-existent');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it('should handle other errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: vi.fn().mockResolvedValue({})
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.exists('gist-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to check gist existence');
      }
    });
  });

  describe('findByFilename', () => {
    it('should find gist by filename', async () => {
      const mockListResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: 'gist-1',
            files: { 'other.md': {} }
          },
          {
            id: 'gist-2',
            files: { 'test.md': {} }
          }
        ])
      };

      const mockDetailResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'gist-2',
          updated_at: '2023-01-01T00:00:00Z',
          files: {
            'test.md': {
              content: 'Found content'
            }
          }
        })
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(mockListResponse as any)
        .mockResolvedValueOnce(mockDetailResponse as any);

      const result = await gistClient.findByFilename('test.md');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data?.id).toBe('gist-2');
        expect(result.data?.content).toBe('Found content');
        expect(result.data?.updatedAt).toBe('2023-01-01T00:00:00Z');
      }

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(1,
        'https://api.github.com/gists?per_page=100',
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenNthCalledWith(2,
        'https://api.github.com/gists/gist-2',
        expect.any(Object)
      );
    });

    it('should return null when file not found', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: 'gist-1',
            files: { 'other.md': {} }
          }
        ])
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.findByFilename('test.md');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should handle empty gist list', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([])
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.findByFilename('test.md');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should handle errors during search', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Search failed'));

      const result = await gistClient.findByFilename('test.md');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to find gist by filename');
        expect(result.error.message).toContain('Search failed');
      }
    });

    it('should handle missing file in detail fetch', async () => {
      const mockListResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: 'gist-1',
            files: { 'test.md': {} }
          }
        ])
      };

      const mockDetailResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'gist-1',
          files: {} // File missing in detail response
        })
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(mockListResponse as any)
        .mockResolvedValueOnce(mockDetailResponse as any);

      const result = await gistClient.findByFilename('test.md');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle missing response fields gracefully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({}) // Empty response
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await gistClient.create('Test', 'Content');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('');
        expect(result.data.updatedAt).toBe('');
      }
    });

    it('should handle non-Error objects in catch blocks', async () => {
      vi.mocked(global.fetch).mockRejectedValue('String error');

      const result = await gistClient.read('test-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to read gist');
        expect(result.error.message).toContain('Unknown error');
      }
    });

    it('should respect isPublic config option', async () => {
      const publicConfig = { ...mockConfig, isPublic: true };
      const publicClient = createGistClient(publicConfig);
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'test-id' })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      await publicClient.create('Public gist', 'Content');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"public":true')
        })
      );
    });
  });
});