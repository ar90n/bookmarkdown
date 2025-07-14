import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchGistRepository } from '../../src/lib/repositories/fetch-gist-repository';
import { RootEntity } from '../../src/lib/entities/root-entity';

// Mock global fetch
global.fetch = vi.fn();

describe('FetchGistRepository - Update Tests', () => {
  const mockConfig = {
    accessToken: 'test-token',
    filename: 'bookmarks.md'
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  it('should update Gist with etag', async () => {
    const initialEtag = '"initial-etag"';
    const repository = new FetchGistRepository(mockConfig, 'test-gist-id', initialEtag);
    
    // Mock the PATCH request for update
    const updateResponse = {
      ok: true,
      headers: new Headers({ 'etag': '"new-etag"' }),
      json: async () => ({})
    };
    
    vi.mocked(fetch).mockResolvedValueOnce(updateResponse as any);
    
    const newRoot = RootEntity.create().addCategory('Updated Category').toRoot();
    const result = await repository.update(newRoot);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(newRoot);
    }
    
    // Verify only the PATCH request was made
    expect(fetch).toHaveBeenCalledTimes(1);
    
    // Verify the PATCH request
    const patchCall = vi.mocked(fetch).mock.calls[0];
    expect(patchCall[0]).toContain('/gists/test-gist-id');
    expect(patchCall[1]?.method).toBe('PATCH');
    const body = JSON.parse(patchCall[1]?.body as string);
    expect(body.files['bookmarks.md'].content).toContain('Updated Category');
    
    // Verify etag was updated
    expect(repository.etag).toBe('"new-etag"');
  });
  
  it('should update with custom description', async () => {
    const repository = new FetchGistRepository(mockConfig, 'test-gist-id', '"etag"');
    
    const updateResponse = {
      ok: true,
      headers: new Headers({ 'etag': '"new-etag"' }),
      json: async () => ({})
    };
    
    vi.mocked(fetch).mockResolvedValueOnce(updateResponse as any);
    
    const newRoot = RootEntity.create().toRoot();
    const result = await repository.update(newRoot, 'Custom description');
    
    expect(result.success).toBe(true);
    
    // Verify description was included in PATCH
    const patchCall = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(patchCall[1]?.body as string);
    expect(body.description).toBe('Custom description');
  });
  
  it('should handle API errors during update', async () => {
    const repository = new FetchGistRepository(mockConfig, 'test-gist-id', '"etag"');
    
    const errorResponse = {
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' })
    };
    
    vi.mocked(fetch).mockResolvedValueOnce(errorResponse as any);
    
    const newRoot = RootEntity.create().toRoot();
    const result = await repository.update(newRoot);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Permission denied');
    }
  });
  
  it('should handle missing etag in update response', async () => {
    const repository = new FetchGistRepository(mockConfig, 'test-gist-id', '"etag"');
    
    const updateResponse = {
      ok: true,
      headers: new Headers(), // No etag
      json: async () => ({})
    };
    
    vi.mocked(fetch).mockResolvedValueOnce(updateResponse as any);
    
    const newRoot = RootEntity.create().toRoot();
    const result = await repository.update(newRoot);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('No etag received from API');
    }
  });
  
  it('should handle network errors', async () => {
    const repository = new FetchGistRepository(mockConfig, 'test-gist-id', '"etag"');
    
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
    
    const newRoot = RootEntity.create().toRoot();
    const result = await repository.update(newRoot);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Failed to update gist: Network error');
    }
  });
});