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
  
  describe('change detection', () => {
    beforeEach(() => {
      // Use fake timers for testing
      vi.useFakeTimers();
    });
    
    afterEach(() => {
      // Restore real timers
      vi.useRealTimers();
    });
    
    it('should call onChangeDetected when remote changes are detected', async () => {
      const onChangeDetected = vi.fn();
      
      const detector = new RemoteChangeDetector({
        repository,
        intervalMs: 1000, // 1 second for testing
        onChangeDetected
      });
      
      // Start detection
      detector.start();
      
      // Initially no changes
      expect(onChangeDetected).not.toHaveBeenCalled();
      
      // Advance time to trigger first check
      await vi.advanceTimersByTimeAsync(1000);
      
      // Still no changes (repository hasn't changed)
      expect(onChangeDetected).not.toHaveBeenCalled();
      
      // Simulate remote change
      const gistId = repository.gistId;
      MockGistRepository.simulateConcurrentModification(gistId);
      
      // Advance time to trigger next check
      await vi.advanceTimersByTimeAsync(1000);
      
      // Now it should detect the change
      expect(onChangeDetected).toHaveBeenCalledTimes(1);
      
      // Stop detection
      detector.stop();
    });
    
    it('should not call onChangeDetected when no changes', async () => {
      const onChangeDetected = vi.fn();
      
      const detector = new RemoteChangeDetector({
        repository,
        intervalMs: 1000,
        onChangeDetected
      });
      
      detector.start();
      
      // Advance time multiple times
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);
      
      // No changes detected
      expect(onChangeDetected).not.toHaveBeenCalled();
      
      detector.stop();
    });
    
    it('should handle errors gracefully', async () => {
      const onChangeDetected = vi.fn();
      
      // Mock console.error to suppress output in tests
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock hasRemoteChanges to throw an error
      vi.spyOn(repository, 'hasRemoteChanges').mockRejectedValueOnce(new Error('Network error'));
      
      const detector = new RemoteChangeDetector({
        repository,
        intervalMs: 1000,
        onChangeDetected
      });
      
      detector.start();
      
      // Advance time to trigger check
      await vi.advanceTimersByTimeAsync(1000);
      
      // Should not crash or call onChangeDetected
      expect(onChangeDetected).not.toHaveBeenCalled();
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error checking for remote changes:', expect.any(Error));
      
      detector.stop();
      
      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
    
    it('should stop checking when stopped', async () => {
      const onChangeDetected = vi.fn();
      
      const detector = new RemoteChangeDetector({
        repository,
        intervalMs: 1000,
        onChangeDetected
      });
      
      detector.start();
      
      // Advance time once
      await vi.advanceTimersByTimeAsync(1000);
      
      // Stop detector
      detector.stop();
      
      // Simulate change after stop
      MockGistRepository.simulateConcurrentModification(repository.gistId);
      
      // Advance time - should not detect change
      await vi.advanceTimersByTimeAsync(5000);
      
      expect(onChangeDetected).not.toHaveBeenCalled();
    });
  });
});