import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookmarkContextProviderV2 } from '../../src/lib/context/providers/useBookmarkContextProviderV2.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';

// Mock BroadcastChannel
global.BroadcastChannel = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onmessage: null,
  onmessageerror: null,
})) as any;

describe('useBookmarkContextProviderV2', () => {
  let repository: MockGistRepository;
  
  beforeEach(() => {
    repository = new MockGistRepository();
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    };
    global.localStorage = localStorageMock as any;
  });
  
  describe('Local operations', () => {
    it('should initialize with empty root', () => {
      const { result } = renderHook(() => useBookmarkContextProviderV2({}));
      
      expect(result.current.root.categories).toHaveLength(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
    
    it('should add category', async () => {
      const { result } = renderHook(() => useBookmarkContextProviderV2({}));
      
      await act(async () => {
        await result.current.addCategory('Development');
      });
      
      expect(result.current.root.categories).toHaveLength(1);
      expect(result.current.root.categories[0].name).toBe('Development');
    });
    
    it('should handle errors', async () => {
      const { result } = renderHook(() => useBookmarkContextProviderV2({}));
      
      // Add a category
      await act(async () => {
        await result.current.addCategory('Development');
      });
      
      // Try to add duplicate
      await act(async () => {
        await result.current.addCategory('Development');
      });
      
      expect(result.current.error).toContain('already exists');
      
      // Clear error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
    
    it('should track isDirty state', async () => {
      const { result } = renderHook(() => useBookmarkContextProviderV2({}));
      
      expect(result.current.isDirty).toBe(false);
      
      await act(async () => {
        await result.current.addCategory('Development');
      });
      
      expect(result.current.isDirty).toBe(true);
    });
  });
  
  describe('Remote operations with mock repository', () => {
    it('should load from remote', async () => {
      // Create a sync shell with mock repository
      const syncShell = new GistSyncShell({ repository });
      
      // Save some data first
      await repository.create({
        description: 'Test',
        content: '# Development\n\n## TypeScript',
        filename: 'bookmarks.md'
      });
      
      const { result } = renderHook(() => useBookmarkContextProviderV2({
        createSyncShell: () => syncShell
      }));
      
      await act(async () => {
        await result.current.loadFromRemote();
      });
      
      expect(result.current.root.categories).toHaveLength(1);
      expect(result.current.root.categories[0].name).toBe('Development');
    });
    
    it('should save to remote', async () => {
      const syncShell = new GistSyncShell({ repository });
      
      const { result } = renderHook(() => useBookmarkContextProviderV2({
        createSyncShell: () => syncShell
      }));
      
      // Add some data
      await act(async () => {
        await result.current.addCategory('Development');
      });
      
      // Save to remote
      await act(async () => {
        await result.current.saveToRemote();
      });
      
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastSyncAt).toBeDefined();
      
      // Verify saved
      const gists = await repository.findByFilename('bookmarks.md');
      expect(gists.success).toBe(true);
      if (gists.success && gists.data) {
        expect(gists.data.content).toContain('# Development');
      }
    });
    
    it('should detect sync conflicts', async () => {
      const syncShell = new GistSyncShell({ repository });
      
      const { result } = renderHook(() => useBookmarkContextProviderV2({
        createSyncShell: () => syncShell
      }));
      
      // Save initial state
      await act(async () => {
        await result.current.addCategory('Development');
        await result.current.saveToRemote();
      });
      
      // Simulate external update
      const gistInfo = result.current.getGistInfo();
      await repository.update({
        gistId: gistInfo.gistId!,
        content: '# External Change',
        etag: gistInfo.etag!
      });
      
      // Make local change
      await act(async () => {
        await result.current.addCategory('Local Change');
      });
      
      // Try to save - should fail with conflict
      await act(async () => {
        await result.current.saveToRemote();
      });
      
      expect(result.current.error).toContain('Remote has been modified');
    });
  });
  
  describe('Import/Export', () => {
    it('should export to markdown', async () => {
      const { result } = renderHook(() => useBookmarkContextProviderV2({}));
      
      await act(async () => {
        await result.current.addCategory('Development');
        await result.current.addBundle('Development', 'TypeScript');
        await result.current.addBookmark('Development', 'TypeScript', {
          title: 'TypeScript Docs',
          url: 'https://www.typescriptlang.org/'
        });
      });
      
      let markdown: string = '';
      await act(async () => {
        markdown = await result.current.exportData('markdown');
      });
      
      expect(markdown).toContain('# Development');
      expect(markdown).toContain('## TypeScript');
      expect(markdown).toContain('[TypeScript Docs](https://www.typescriptlang.org/)');
    });
    
    it('should import from markdown', async () => {
      const { result } = renderHook(() => useBookmarkContextProviderV2({}));
      
      const markdown = `# Development

## TypeScript

- [TypeScript Docs](https://www.typescriptlang.org/)
  - tags: docs, typescript`;
      
      await act(async () => {
        await result.current.importData(markdown, 'markdown');
      });
      
      expect(result.current.root.categories).toHaveLength(1);
      expect(result.current.root.categories[0].bundles[0].bookmarks[0].tags).toEqual(['docs', 'typescript']);
    });
  });
});