import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FetchGistRepository } from '../../src/lib/repositories/fetch-gist-repository.js';
import { RootEntity } from '../../src/lib/entities/root-entity.js';
import type { GistRepositoryConfig } from '../../src/lib/repositories/gist-repository.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('FetchGistRepository', () => {
  const mockConfig: GistRepositoryConfig = {
    accessToken: 'test-token',
    filename: 'bookmarks.md'
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('create', () => {
    describe('when creating a new Gist', () => {
      it('should create a new Gist when no gistId is provided', async () => {
        const mockResponse = {
          ok: true,
          headers: new Headers({ 'etag': '"test-etag"' }),
          json: async () => ({ id: 'new-gist-id' })
        };
        
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);
        
        const result = await FetchGistRepository.create(mockConfig, {});
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.gistId).toBe('new-gist-id');
          expect(result.data.etag).toBe('"test-etag"');
        }
        
        // Verify fetch was called correctly
        expect(fetch).toHaveBeenCalledWith(
          'https://api.github.com/gists',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-token',
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'Content-Type': 'application/json'
            }),
            body: expect.stringContaining('"BookMarkDown"')
          })
        );
      });
      
      it('should create Gist with custom description and public status', async () => {
        const mockResponse = {
          ok: true,
          headers: new Headers({ 'etag': '"test-etag"' }),
          json: async () => ({ id: 'new-gist-id' })
        };
        
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);
        
        const result = await FetchGistRepository.create(mockConfig, {
          description: 'My Bookmarks',
          isPublic: true
        });
        
        expect(result.success).toBe(true);
        
        // Verify the request body contains custom values
        const bodyCall = vi.mocked(fetch).mock.calls[0][1]?.body as string;
        const parsedBody = JSON.parse(bodyCall);
        expect(parsedBody.description).toBe('My Bookmarks');
        expect(parsedBody.public).toBe(true);
      });
      
      it('should create Gist with provided Root data', async () => {
        const mockResponse = {
          ok: true,
          headers: new Headers({ 'etag': '"test-etag"' }),
          json: async () => ({ id: 'new-gist-id' })
        };
        
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);
        
        const customRoot = RootEntity.create().addCategory('Test Category').toRoot();
        
        const result = await FetchGistRepository.create(mockConfig, {
          root: customRoot
        });
        
        expect(result.success).toBe(true);
        
        // Verify the content includes the category
        const bodyCall = vi.mocked(fetch).mock.calls[0][1]?.body as string;
        const parsedBody = JSON.parse(bodyCall);
        expect(parsedBody.files['bookmarks.md'].content).toContain('Test Category');
      });
      
      it('should handle API errors when creating Gist', async () => {
        const mockResponse = {
          ok: false,
          status: 401,
          json: async () => ({ message: 'Bad credentials' })
        };
        
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);
        
        const result = await FetchGistRepository.create(mockConfig, {});
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Authentication failed');
        }
      });
      
      it('should handle missing etag in response', async () => {
        const mockResponse = {
          ok: true,
          headers: new Headers({}), // No etag
          json: async () => ({ id: 'new-gist-id' })
        };
        
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);
        
        const result = await FetchGistRepository.create(mockConfig, {});
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBe('No etag received from API');
        }
      });
    });
    
    describe('when binding to existing Gist', () => {
      it('should bind to existing Gist when gistId is provided', async () => {
        const mockResponse = {
          ok: true,
          headers: new Headers({ 'etag': '"existing-etag"' })
        };
        
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);
        
        const result = await FetchGistRepository.create(mockConfig, {
          gistId: 'existing-gist-id'
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.gistId).toBe('existing-gist-id');
          expect(result.data.etag).toBe('"existing-etag"');
        }
        
        // Verify fetch was called with GET
        expect(fetch).toHaveBeenCalledWith(
          'https://api.github.com/gists/existing-gist-id',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-token'
            })
          })
        );
      });
      
      it('should handle 404 when Gist not found', async () => {
        const mockResponse = {
          ok: false,
          status: 404,
          json: async () => ({ message: 'Not Found' })
        };
        
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);
        
        const result = await FetchGistRepository.create(mockConfig, {
          gistId: 'non-existent-id'
        });
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBe('Gist non-existent-id not found');
        }
      });
    });
    
    describe('config validation', () => {
      it('should fail if access token is missing', async () => {
        const invalidConfig = { ...mockConfig, accessToken: '' };
        
        const result = await FetchGistRepository.create(invalidConfig, {});
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBe('Access token is required');
        }
        expect(fetch).not.toHaveBeenCalled();
      });
      
      it('should fail if filename is missing', async () => {
        const invalidConfig = { ...mockConfig, filename: '' };
        
        const result = await FetchGistRepository.create(invalidConfig, {});
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBe('Filename is required');
        }
        expect(fetch).not.toHaveBeenCalled();
      });
      
      it('should use custom API base URL', async () => {
        const customConfig = {
          ...mockConfig,
          apiBaseUrl: 'https://custom.github.com'
        };
        
        const mockResponse = {
          ok: true,
          headers: new Headers({ 'etag': '"test-etag"' }),
          json: async () => ({ id: 'new-gist-id' })
        };
        
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);
        
        await FetchGistRepository.create(customConfig, {});
        
        expect(fetch).toHaveBeenCalledWith(
          'https://custom.github.com/gists',
          expect.any(Object)
        );
      });
    });
  });
  
  describe('update', () => {
    let repository: FetchGistRepository;
    
    beforeEach(async () => {
      // Create a repository instance for testing
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'etag': '"initial-etag"' }),
        json: async () => ({ id: 'test-gist-id' })
      };
      
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);
      
      const result = await FetchGistRepository.create(mockConfig, {
        gistId: 'test-gist-id'
      });
      
      if (result.success) {
        repository = result.data;
      }
    });
    
    it('should update Gist with commit verification', async () => {
      // Mock the GET request for current state
      const beforeResponse = {
        ok: true,
        json: async () => ({
          history: [{ version: 'old-commit-hash' }]
        })
      };
      
      // Mock the PATCH request for update
      const updateResponse = {
        ok: true,
        headers: new Headers({ 'etag': '"new-etag"' }),
        json: async () => ({
          history: [{ version: 'new-commit-hash' }]
        })
      };
      
      // Mock the GET request for commit history
      const commitsResponse = {
        ok: true,
        json: async () => ([
          { version: 'new-commit-hash', committed_at: '2023-01-02' },
          { version: 'old-commit-hash', committed_at: '2023-01-01' }
        ])
      };
      
      vi.mocked(fetch)
        .mockResolvedValueOnce(beforeResponse as any)
        .mockResolvedValueOnce(updateResponse as any)
        .mockResolvedValueOnce(commitsResponse as any);
      
      const newRoot = RootEntity.create().addCategory('Updated Category').toRoot();
      const result = await repository.update(newRoot);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(newRoot);
      }
      
      // Verify all three requests were made
      expect(fetch).toHaveBeenCalledTimes(4); // 1 from setup + 3 from update
      
      // Verify PATCH request body
      const patchCall = vi.mocked(fetch).mock.calls[2];
      expect(patchCall[0]).toContain('/gists/test-gist-id');
      expect(patchCall[1]?.method).toBe('PATCH');
      const body = JSON.parse(patchCall[1]?.body as string);
      expect(body.files['bookmarks.md'].content).toContain('Updated Category');
    });
    
    it('should detect concurrent modification', async () => {
      // Mock the GET request for current state
      const beforeResponse = {
        ok: true,
        json: async () => ({
          history: [{ version: 'old-commit-hash' }]
        })
      };
      
      // Mock the PATCH request for update
      const updateResponse = {
        ok: true,
        headers: new Headers({ 'etag': '"new-etag"' }),
        json: async () => ({
          history: [{ version: 'new-commit-hash' }]
        })
      };
      
      // Mock the GET request for commit history with wrong order
      const commitsResponse = {
        ok: true,
        json: async () => ([
          { version: 'another-commit-hash', committed_at: '2023-01-03' },
          { version: 'old-commit-hash', committed_at: '2023-01-02' },
          { version: 'new-commit-hash', committed_at: '2023-01-01' }
        ])
      };
      
      vi.mocked(fetch)
        .mockResolvedValueOnce(beforeResponse as any)
        .mockResolvedValueOnce(updateResponse as any)
        .mockResolvedValueOnce(commitsResponse as any);
      
      const newRoot = RootEntity.create().addCategory('Updated Category').toRoot();
      const result = await repository.update(newRoot);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Concurrent modification detected');
      }
    });
    
    it('should update with custom description', async () => {
      // Mock the GET request for current state
      const beforeResponse = {
        ok: true,
        json: async () => ({
          history: [{ version: 'old-commit-hash' }]
        })
      };
      
      // Mock the PATCH request for update
      const updateResponse = {
        ok: true,
        headers: new Headers({ 'etag': '"new-etag"' }),
        json: async () => ({
          history: [{ version: 'new-commit-hash' }]
        })
      };
      
      // Mock the GET request for commit history
      const commitsResponse = {
        ok: true,
        json: async () => ([
          { version: 'new-commit-hash', committed_at: '2023-01-02' },
          { version: 'old-commit-hash', committed_at: '2023-01-01' }
        ])
      };
      
      vi.mocked(fetch)
        .mockResolvedValueOnce(beforeResponse as any)
        .mockResolvedValueOnce(updateResponse as any)
        .mockResolvedValueOnce(commitsResponse as any);
      
      const newRoot = RootEntity.create().toRoot();
      const result = await repository.update(newRoot, 'Custom description');
      
      expect(result.success).toBe(true);
      
      // Verify description was included in PATCH
      const patchCall = vi.mocked(fetch).mock.calls[2];
      const body = JSON.parse(patchCall[1]?.body as string);
      expect(body.description).toBe('Custom description');
    });
    
    it('should handle API errors during update', async () => {
      const beforeResponse = {
        ok: false,
        status: 403,
        json: async () => ({ message: 'Forbidden' })
      };
      
      vi.mocked(fetch).mockResolvedValueOnce(beforeResponse as any);
      
      const newRoot = RootEntity.create().toRoot();
      const result = await repository.update(newRoot);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Permission denied');
      }
    });
    
    it('should handle missing commit hash in before state', async () => {
      const beforeResponse = {
        ok: true,
        json: async () => ({
          // No history field
        })
      };
      
      vi.mocked(fetch).mockResolvedValueOnce(beforeResponse as any);
      
      const newRoot = RootEntity.create().toRoot();
      const result = await repository.update(newRoot);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Could not get current commit hash');
      }
    });
    
    it('should handle missing etag in update response', async () => {
      const beforeResponse = {
        ok: true,
        json: async () => ({
          history: [{ version: 'old-commit-hash' }]
        })
      };
      
      const updateResponse = {
        ok: true,
        headers: new Headers({}), // No etag
        json: async () => ({
          history: [{ version: 'new-commit-hash' }]
        })
      };
      
      vi.mocked(fetch)
        .mockResolvedValueOnce(beforeResponse as any)
        .mockResolvedValueOnce(updateResponse as any);
      
      const newRoot = RootEntity.create().toRoot();
      const result = await repository.update(newRoot);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('No etag received from API');
      }
    });
    
    it('should handle commit verification failure', async () => {
      const beforeResponse = {
        ok: true,
        json: async () => ({
          history: [{ version: 'old-commit-hash' }]
        })
      };
      
      const updateResponse = {
        ok: true,
        headers: new Headers({ 'etag': '"new-etag"' }),
        json: async () => ({
          history: [{ version: 'new-commit-hash' }]
        })
      };
      
      const commitsResponse = {
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' })
      };
      
      vi.mocked(fetch)
        .mockResolvedValueOnce(beforeResponse as any)
        .mockResolvedValueOnce(updateResponse as any)
        .mockResolvedValueOnce(commitsResponse as any);
      
      const newRoot = RootEntity.create().toRoot();
      const result = await repository.update(newRoot);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Could not verify commit order');
      }
    });
  });
});