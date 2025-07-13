import { describe, it, expect, beforeEach } from 'vitest';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import { RootEntity } from '../../src/lib/entities/root-entity.js';
import type { GistRepositoryConfig } from '../../src/lib/repositories/gist-repository.js';

describe('GistSyncShell', () => {
  let syncShell: GistSyncShell;
  
  const mockConfig: GistRepositoryConfig = {
    accessToken: 'test-token',
    filename: 'bookmarks.md'
  };
  
  beforeEach(() => {
    // Clear mock data before each test
    MockGistRepository.clearAll();
    
    syncShell = new GistSyncShell({
      repositoryConfig: mockConfig,
      useMock: true
    });
  });
  
  describe('initialize and load', () => {
    it('should initialize with existing gist by ID', async () => {
      // First create a gist directly with MockGistRepository
      const testRoot = RootEntity.create()
        .addCategory('Test Category')
        .toRoot();
      
      const createResult = await MockGistRepository.create(mockConfig, {
        root: testRoot,
        description: 'Test Gist'
      });
      
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      
      const gistId = createResult.data.gistId;
      
      // Initialize sync shell with the gist ID
      const initResult = await syncShell.initialize(gistId);
      expect(initResult.success).toBe(true);
      
      // Load the data
      const loadResult = await syncShell.load();
      expect(loadResult.success).toBe(true);
      if (!loadResult.success) return;
      
      expect(loadResult.data.categories).toHaveLength(1);
      expect(loadResult.data.categories[0].name).toBe('Test Category');
      
      // Check gist info
      const info = syncShell.getGistInfo();
      expect(info.gistId).toBe(gistId);
    });
    
    it('should find gist by filename when no ID provided', async () => {
      // Create a gist
      const testRoot = RootEntity.create()
        .addCategory('Found Category')
        .toRoot();
      
      const createResult = await MockGistRepository.create(mockConfig, {
        root: testRoot
      });
      
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      
      // Initialize without gist ID (should find by filename)
      const initResult = await syncShell.initialize();
      expect(initResult.success).toBe(true);
      
      // Load the data
      const loadResult = await syncShell.load();
      expect(loadResult.success).toBe(true);
      if (!loadResult.success) return;
      
      expect(loadResult.data.categories.some(c => c.name === 'Found Category')).toBe(true);
    });
    
    it('should create new gist when none exists', async () => {
      // Initialize without gist ID and no existing gist
      const initResult = await syncShell.initialize();
      expect(initResult.success).toBe(true);
      
      // Load should return empty root (or default content)
      const loadResult = await syncShell.load();
      expect(loadResult.success).toBe(true);
      if (!loadResult.success) return;
      
      // Should have created a new gist
      const info = syncShell.getGistInfo();
      expect(info.gistId).toBeDefined();
    });
  });
  
  describe('save', () => {
    it('should save data to repository', async () => {
      // Initialize
      const initResult = await syncShell.initialize();
      expect(initResult.success).toBe(true);
      
      // Create test data
      const testRoot = RootEntity.create()
        .addCategory('Save Test')
        .toRoot();
      
      // Save
      const saveResult = await syncShell.save(testRoot);
      expect(saveResult.success).toBe(true);
      if (!saveResult.success) return;
      
      expect(saveResult.data.root).toEqual(testRoot);
      
      // Verify by loading
      const loadResult = await syncShell.load();
      expect(loadResult.success).toBe(true);
      if (!loadResult.success) return;
      
      expect(loadResult.data.categories.some(c => c.name === 'Save Test')).toBe(true);
    });
    
    it('should handle concurrent modification', async () => {
      // Create initial gist with some data
      const initialRoot = RootEntity.create()
        .addCategory('Initial')
        .toRoot();
      
      const createResult = await MockGistRepository.create(mockConfig, {
        root: initialRoot
      });
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      
      const gistId = createResult.data.gistId;
      
      // Initialize sync shell with the gist
      const initResult = await syncShell.initialize(gistId);
      expect(initResult.success).toBe(true);
      
      // Load to establish baseline
      const loadResult = await syncShell.load();
      expect(loadResult.success).toBe(true);
      
      // Save once to establish our etag
      const firstSave = await syncShell.save(
        RootEntity.fromRoot(loadResult.data!).addCategory('First Update').toRoot()
      );
      expect(firstSave.success).toBe(true);
      
      // Simulate concurrent modification
      MockGistRepository.simulateConcurrentModification(gistId);
      
      // Try to save again (should fail due to concurrent modification)
      const testRoot = RootEntity.create()
        .addCategory('Concurrent Test')
        .toRoot();
      
      const saveResult = await syncShell.save(testRoot);
      expect(saveResult.success).toBe(false);
      if (!saveResult.success) {
        expect(saveResult.error.message).toContain('Concurrent modification detected');
      }
    });
  });
  
  describe('isRemoteUpdated', () => {
    it('should detect remote changes', async () => {
      // Initialize
      const initResult = await syncShell.initialize();
      expect(initResult.success).toBe(true);
      
      // Get gist info
      const info = syncShell.getGistInfo();
      const gistId = info.gistId;
      expect(gistId).toBeDefined();
      if (!gistId) return;
      
      // Initially no changes
      const hasChanges1 = await syncShell.isRemoteUpdated();
      expect(hasChanges1.success).toBe(true);
      if (!hasChanges1.success) return;
      expect(hasChanges1.data).toBe(false);
      
      // Simulate remote change
      MockGistRepository.simulateConcurrentModification(gistId);
      
      // Should detect changes
      const hasChanges2 = await syncShell.isRemoteUpdated();
      expect(hasChanges2.success).toBe(true);
      if (!hasChanges2.success) return;
      expect(hasChanges2.data).toBe(true);
    });
  });
  
  describe('static createNew', () => {
    it('should create new gist with initial data', async () => {
      const testRoot = RootEntity.create()
        .addCategory('Initial Category')
        .toRoot();
      
      const result = await GistSyncShell.createNew(
        mockConfig,
        testRoot,
        'New Gist',
        false,
        true // useMock
      );
      
      expect(result.success).toBe(true);
      if (!result.success) return;
      
      const shell = result.data;
      
      // Should be able to load the data
      const loadResult = await shell.load();
      expect(loadResult.success).toBe(true);
      if (!loadResult.success) return;
      
      expect(loadResult.data.categories.some(c => c.name === 'Initial Category')).toBe(true);
      
      // Check gist info
      const info = shell.getGistInfo();
      expect(info.gistId).toBeDefined();
    });
  });
  
  describe('error handling', () => {
    it('should handle uninitialized repository', async () => {
      // Try to load without initializing
      const loadResult = await syncShell.load();
      expect(loadResult.success).toBe(false);
      if (!loadResult.success) {
        expect(loadResult.error.message).toContain('Repository not initialized');
      }
      
      // Try to save without initializing
      const saveResult = await syncShell.save(RootEntity.create().toRoot());
      expect(saveResult.success).toBe(false);
      if (!saveResult.success) {
        expect(saveResult.error.message).toContain('Repository not initialized');
      }
      
      // Try to check remote without initializing
      const remoteResult = await syncShell.isRemoteUpdated();
      expect(remoteResult.success).toBe(false);
      if (!remoteResult.success) {
        expect(remoteResult.error.message).toContain('Repository not initialized');
      }
    });
  });
});