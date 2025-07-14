import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service.js';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';

describe('BookmarkService - Dirty State Tracking', () => {
  let service: any; // Using any to access private properties
  let syncShell: GistSyncShell;
  
  beforeEach(async () => {
    MockGistRepository.clearAll();
    
    syncShell = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await syncShell.initialize();
    service = createBookmarkService(syncShell);
  });
  
  it('should have isDirty method', () => {
    expect(typeof service.isDirty).toBe('function');
  });
  
  it('should start with isDirty false', () => {
    expect(service.isDirty()).toBe(false);
  });
  
  it('should set isDirty to true when adding category', () => {
    service.addCategory('Test Category');
    expect(service.isDirty()).toBe(true);
  });
  
  it('should set isDirty to true when removing category', async () => {
    service.addCategory('Test Category');
    await service.saveToRemote(); // Reset dirty flag
    
    service.removeCategory('Test Category');
    expect(service.isDirty()).toBe(true);
  });
  
  it('should set isDirty to true when renaming category', async () => {
    service.addCategory('Old Name');
    await service.saveToRemote(); // Reset dirty flag
    
    service.renameCategory('Old Name', 'New Name');
    expect(service.isDirty()).toBe(true);
  });
  
  it('should set isDirty to true when adding bundle', async () => {
    service.addCategory('Category');
    await service.saveToRemote(); // Reset dirty flag
    
    service.addBundle('Category', 'Bundle');
    expect(service.isDirty()).toBe(true);
  });
  
  it('should set isDirty to true when adding bookmark', async () => {
    service.addCategory('Category');
    service.addBundle('Category', 'Bundle');
    await service.saveToRemote(); // Reset dirty flag
    
    service.addBookmark('Category', 'Bundle', {
      title: 'Test',
      url: 'https://example.com'
    });
    expect(service.isDirty()).toBe(true);
  });
  
  it('should reset isDirty to false after successful save', async () => {
    service.addCategory('Test Category');
    expect(service.isDirty()).toBe(true);
    
    await service.saveToRemote();
    expect(service.isDirty()).toBe(false);
  });
  
  it('should reset isDirty to false after successful load', async () => {
    service.addCategory('Test Category');
    expect(service.isDirty()).toBe(true);
    
    await service.loadFromRemote();
    expect(service.isDirty()).toBe(false);
  });
  
  it('should not set isDirty on failed operations', () => {
    // Try to remove non-existent category
    const result = service.removeCategory('NonExistent');
    expect(result.success).toBe(false);
    expect(service.isDirty()).toBe(false);
  });
  
  it('should track isDirty across multiple operations', async () => {
    // Multiple operations
    service.addCategory('Cat1');
    service.addCategory('Cat2');
    service.addBundle('Cat1', 'Bundle1');
    
    expect(service.isDirty()).toBe(true);
    
    // Save resets
    await service.saveToRemote();
    expect(service.isDirty()).toBe(false);
    
    // More operations
    service.removeBundle('Cat1', 'Bundle1');
    expect(service.isDirty()).toBe(true);
  });
});