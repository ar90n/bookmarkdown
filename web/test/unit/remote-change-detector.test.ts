import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemoteChangeDetector } from '../../src/lib/services/remote-change-detector.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import type { GistRepositoryConfig } from '../../src/lib/repositories/gist-repository.js';

describe('RemoteChangeDetector', () => {
  let detector: RemoteChangeDetector;
  let repository: MockGistRepository;
  
  const mockConfig: GistRepositoryConfig = {
    accessToken: 'test-token',
    filename: 'bookmarks.md'
  };
  
  beforeEach(async () => {
    // Clear mock data
    MockGistRepository.clearAll();
    
    // Create a repository
    const createResult = await MockGistRepository.create(mockConfig, {});
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;
    
    repository = createResult.data as MockGistRepository;
    
    detector = new RemoteChangeDetector({
      repository
    });
  });
  
  describe('basic functionality', () => {
    it('should not be running initially', () => {
      expect(detector.isRunning()).toBe(false);
    });
    
    it('should start and stop', () => {
      // Start the detector
      detector.start();
      expect(detector.isRunning()).toBe(true);
      
      // Stop the detector
      detector.stop();
      expect(detector.isRunning()).toBe(false);
    });
    
    it('should handle multiple starts', () => {
      // Start once
      detector.start();
      expect(detector.isRunning()).toBe(true);
      
      // Start again - should not throw
      detector.start();
      expect(detector.isRunning()).toBe(true);
    });
    
    it('should handle multiple stops', () => {
      // Start then stop
      detector.start();
      detector.stop();
      expect(detector.isRunning()).toBe(false);
      
      // Stop again - should not throw
      detector.stop();
      expect(detector.isRunning()).toBe(false);
    });
  });
  
  describe('configuration', () => {
    it('should accept custom interval', () => {
      const customDetector = new RemoteChangeDetector({
        repository,
        intervalMs: 5000 // 5 seconds
      });
      
      // Just verify it creates without error
      expect(customDetector.isRunning()).toBe(false);
    });
    
    it('should use default interval if not specified', () => {
      const defaultDetector = new RemoteChangeDetector({
        repository
      });
      
      // Just verify it creates without error
      expect(defaultDetector.isRunning()).toBe(false);
    });
  });
});