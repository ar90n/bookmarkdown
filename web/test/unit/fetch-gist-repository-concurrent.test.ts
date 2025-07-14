import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchGistRepository } from '../../src/lib/repositories/fetch-gist-repository';
import { createRoot } from '../../src/lib/core';

// Mock global fetch
global.fetch = vi.fn();

describe('FetchGistRepository - Concurrent Modification', () => {
  const mockConfig = {
    accessToken: 'test-token',
    filename: 'bookmarks.md'
  };
  
  const mockGistId = 'test-gist-id';
  const mockEtag = '"test-etag"';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  it('should successfully update when commit order is correct', async () => {
    const repository = new FetchGistRepository(mockConfig, mockGistId, mockEtag);
    const root = createRoot();
    
    // Mock responses
    const beforeCommitHash = 'commit-before';
    const afterCommitHash = 'commit-after';
    
    // Step 1: Get current state
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        history: [{ version: beforeCommitHash }]
      })
    });
    
    // Step 2: Update gist
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['etag', '"new-etag"']]),
      json: async () => ({
        history: [{ version: afterCommitHash }]
      })
    });
    
    // Step 4: Get commits
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { version: afterCommitHash },  // New commit first
        { version: beforeCommitHash }  // Old commit second
      ])
    });
    
    const result = await repository.update(root);
    
    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
  
  it('should succeed even when commit is not immediately visible in history', async () => {
    const repository = new FetchGistRepository(mockConfig, mockGistId, mockEtag);
    const root = createRoot();
    
    const beforeCommitHash = 'commit-before';
    const afterCommitHash = 'commit-after';
    
    // Step 1: Get current state
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        history: [{ version: beforeCommitHash }]
      })
    });
    
    // Step 2: Update gist
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['etag', '"new-etag"']]),
      json: async () => ({
        history: [{ version: afterCommitHash }]
      })
    });
    
    // Step 4: Get commits - New commit not visible yet (eventual consistency)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { version: beforeCommitHash },  // Only old commits visible
        { version: 'older-commit' }
      ])
    });
    
    const result = await repository.update(root);
    
    // Should succeed with the simplified logic (trusts etag)
    expect(result.success).toBe(true);
  });
  
  it('should handle missing history field', async () => {
    const repository = new FetchGistRepository(mockConfig, mockGistId, mockEtag);
    const root = createRoot();
    
    // Step 1: Get current state without history
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})  // No history field
    });
    
    const result = await repository.update(root);
    
    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Could not get current commit hash');
  });
  
  it('should handle empty history array', async () => {
    const repository = new FetchGistRepository(mockConfig, mockGistId, mockEtag);
    const root = createRoot();
    
    // Step 1: Get current state with empty history
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        history: []  // Empty history
      })
    });
    
    const result = await repository.update(root);
    
    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Could not get current commit hash');
  });
  
  it('should handle commits API failure', async () => {
    const repository = new FetchGistRepository(mockConfig, mockGistId, mockEtag);
    const root = createRoot();
    
    const beforeCommitHash = 'commit-before';
    const afterCommitHash = 'commit-after';
    
    // Step 1: Get current state
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        history: [{ version: beforeCommitHash }]
      })
    });
    
    // Step 2: Update gist
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['etag', '"new-etag"']]),
      json: async () => ({
        history: [{ version: afterCommitHash }]
      })
    });
    
    // Step 4: Get commits fails
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });
    
    const result = await repository.update(root);
    
    // Should succeed - we trust the etag even if commits can't be verified
    expect(result.success).toBe(true);
  });
  
  it('should handle when new commit is not found in history', async () => {
    const repository = new FetchGistRepository(mockConfig, mockGistId, mockEtag);
    const root = createRoot();
    
    const beforeCommitHash = 'commit-before';
    const afterCommitHash = 'commit-after';
    
    // Step 1: Get current state
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        history: [{ version: beforeCommitHash }]
      })
    });
    
    // Step 2: Update gist
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['etag', '"new-etag"']]),
      json: async () => ({
        history: [{ version: afterCommitHash }]
      })
    });
    
    // Step 4: Get commits - neither commit found
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { version: 'some-other-commit' },
        { version: 'another-commit' }
      ])
    });
    
    const result = await repository.update(root);
    
    // Should succeed - we trust the etag even if commit is not visible
    expect(result.success).toBe(true);
  });
  
  it('should handle same commit hash before and after update', async () => {
    const repository = new FetchGistRepository(mockConfig, mockGistId, mockEtag);
    const root = createRoot();
    
    const sameCommitHash = 'same-commit';
    
    // Step 1: Get current state
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        history: [{ version: sameCommitHash }]
      })
    });
    
    // Step 2: Update gist
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['etag', '"new-etag"']]),
      json: async () => ({
        history: [{ version: sameCommitHash }]  // Same hash!
      })
    });
    
    // Step 4: Get commits
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { version: sameCommitHash }
      ])
    });
    
    const result = await repository.update(root);
    
    // This should fail as the commit didn't change
    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Update did not create a new commit');
  });
});