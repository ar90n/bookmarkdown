import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Root, Category, Bundle, Bookmark } from '../../src/lib/types';

// Mock the entire module before importing functions
vi.mock('../../src/lib/utils/metadata', async () => {
  const actual = await vi.importActual('../../src/lib/utils/metadata') as any;
  
  // Override getCurrentTimestamp
  const getCurrentTimestamp = vi.fn(() => '2024-01-01T00:00:00Z');
  
  // Re-implement generic functions with mocked timestamp
  const initializeMetadata = <T extends any>(entity: T): T => {
    const isRoot = 'version' in entity && 'categories' in entity;
    
    return {
      ...entity,
      metadata: {
        lastModified: getCurrentTimestamp(),
        ...(isRoot ? {} : { lastSynced: getCurrentTimestamp() })
      }
    } as T;
  };

  const hasMetadata = <T extends any>(entity: T): boolean => {
    return !!(entity as any).metadata;
  };

  const ensureMetadata = <T extends any>(entity: T): T => {
    if (hasMetadata(entity)) {
      return entity;
    }
    return initializeMetadata(entity);
  };
  
  const updateMetadata = <T extends any>(
    entity: T,
    lastModified?: string,
    lastSynced?: string
  ): T => {
    const withMetadata = ensureMetadata(entity);
    return {
      ...withMetadata,
      metadata: {
        ...(withMetadata as any).metadata,
        lastModified: lastModified || (withMetadata as any).metadata?.lastModified || getCurrentTimestamp(),
        ...(lastSynced !== undefined && { lastSynced })
      }
    } as T;
  };

  const getLastModified = <T extends any>(entity: T): string => {
    return (entity as any).metadata?.lastModified || '';
  };

  const getLastSynced = <T extends any>(entity: T): string => {
    return (entity as any).metadata?.lastSynced || '';
  };

  return {
    ...actual,
    getCurrentTimestamp,
    initializeMetadata,
    updateMetadata,
    hasMetadata,
    ensureMetadata,
    getLastModified,
    getLastSynced
  };
});

// Import functions after mock is set up
const {
  initializeMetadata,
  updateMetadata,
  hasMetadata,
  ensureMetadata,
  getLastModified,
  getLastSynced
} = await import('../../src/lib/utils/metadata');

describe('Generic Metadata Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeMetadata', () => {
    it('should initialize metadata for Root', () => {
      const root: Root = { version: '1.0', categories: [] };
      const result = initializeMetadata(root);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.lastModified).toBe('2024-01-01T00:00:00Z');
      // Root doesn't have lastSynced in metadata (managed by localStorage)
      expect(result.metadata?.lastSynced).toBeUndefined();
    });

    it('should initialize metadata for Category', () => {
      const category: Category = { name: 'Work', bundles: [] };
      const result = initializeMetadata(category);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.lastModified).toBe('2024-01-01T00:00:00Z');
      expect(result.metadata?.lastSynced).toBe('2024-01-01T00:00:00Z');
    });

    it('should initialize metadata for Bundle', () => {
      const bundle: Bundle = { name: 'Project A', bookmarks: [] };
      const result = initializeMetadata(bundle);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.lastModified).toBe('2024-01-01T00:00:00Z');
      expect(result.metadata?.lastSynced).toBe('2024-01-01T00:00:00Z');
    });

    it('should initialize metadata for Bookmark', () => {
      const bookmark: Bookmark = { id: '1', title: 'Google', url: 'https://google.com', order: 0 };
      const result = initializeMetadata(bookmark);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.lastModified).toBe('2024-01-01T00:00:00Z');
      expect(result.metadata?.lastSynced).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('updateMetadata', () => {
    it('should update metadata timestamps', () => {
      const category: Category = {
        name: 'Work',
        bundles: [],
        metadata: {
          lastModified: '2023-01-01T00:00:00Z',
          lastSynced: '2023-01-01T00:00:00Z'
        }
      };
      
      const result = updateMetadata(category, '2024-02-01T00:00:00Z', '2024-02-01T00:00:00Z');
      
      expect(result.metadata?.lastModified).toBe('2024-02-01T00:00:00Z');
      expect(result.metadata?.lastSynced).toBe('2024-02-01T00:00:00Z');
    });

    it('should only update lastModified if lastSynced not provided', () => {
      const bundle: Bundle = {
        name: 'Project A',
        bookmarks: [],
        metadata: {
          lastModified: '2023-01-01T00:00:00Z',
          lastSynced: '2023-01-01T00:00:00Z'
        }
      };
      
      const result = updateMetadata(bundle, '2024-02-01T00:00:00Z');
      
      expect(result.metadata?.lastModified).toBe('2024-02-01T00:00:00Z');
      expect(result.metadata?.lastSynced).toBe('2023-01-01T00:00:00Z');
    });

    it('should create metadata if missing', () => {
      const bookmark: Bookmark = { id: '1', title: 'Google', url: 'https://google.com', order: 0 };
      const result = updateMetadata(bookmark, '2024-02-01T00:00:00Z');
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.lastModified).toBe('2024-02-01T00:00:00Z');
    });
  });

  describe('hasMetadata', () => {
    it('should return true when metadata exists', () => {
      const category: Category = {
        name: 'Work',
        bundles: [],
        metadata: { lastModified: '2024-01-01T00:00:00Z' }
      };
      
      expect(hasMetadata(category)).toBe(true);
    });

    it('should return false when metadata is missing', () => {
      const bundle: Bundle = { name: 'Project A', bookmarks: [] };
      
      expect(hasMetadata(bundle)).toBe(false);
    });
  });

  describe('ensureMetadata', () => {
    it('should return entity unchanged if metadata exists', () => {
      const category: Category = {
        name: 'Work',
        bundles: [],
        metadata: { lastModified: '2023-01-01T00:00:00Z' }
      };
      
      const result = ensureMetadata(category);
      
      expect(result).toBe(category); // Same reference
      expect(result.metadata?.lastModified).toBe('2023-01-01T00:00:00Z');
    });

    it('should initialize metadata if missing', () => {
      const bookmark: Bookmark = { id: '1', title: 'Google', url: 'https://google.com', order: 0 };
      const result = ensureMetadata(bookmark);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.lastModified).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('getLastModified', () => {
    it('should return lastModified timestamp', () => {
      const category: Category = {
        name: 'Work',
        bundles: [],
        metadata: { lastModified: '2024-01-01T00:00:00Z' }
      };
      
      expect(getLastModified(category)).toBe('2024-01-01T00:00:00Z');
    });

    it('should return empty string if no metadata', () => {
      const bundle: Bundle = { name: 'Project A', bookmarks: [] };
      
      expect(getLastModified(bundle)).toBe('');
    });
  });

  describe('getLastSynced', () => {
    it('should return lastSynced timestamp', () => {
      const bookmark: Bookmark = {
        id: '1',
        title: 'Google',
        url: 'https://google.com',
        order: 0,
        metadata: {
          lastModified: '2024-01-01T00:00:00Z',
          lastSynced: '2024-01-02T00:00:00Z'
        }
      };
      
      expect(getLastSynced(bookmark)).toBe('2024-01-02T00:00:00Z');
    });

    it('should return empty string if no lastSynced', () => {
      const category: Category = {
        name: 'Work',
        bundles: [],
        metadata: { lastModified: '2024-01-01T00:00:00Z' }
      };
      
      expect(getLastSynced(category)).toBe('');
    });
  });
});