import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock time module
vi.mock('../../../web/src/lib/utils/time', () => ({
  getCurrentTimestamp: vi.fn(() => '2024-01-01T00:00:00.000Z')
}));
import {
  updateWithMetadata,
  softDelete,
  restore,
  updateArrayItemById,
  updateArrayItem,
  removeArrayItemById,
  removeArrayItem,
  addToArray,
  moveArrayItem,
  updateNested,
  batchUpdate,
  createEntity,
  entityExists,
  findEntityById,
  sortByMetadata,
  filterActive,
  filterDeleted,
  type EntityWithMetadata,
  type EntityWithId
} from '../../../web/src/utils/entityHelpers';

// Mock getCurrentTimestamp
vi.mock('../../src/lib/utils/metadata', () => ({
  getCurrentTimestamp: vi.fn(() => '2024-01-01T00:00:00.000Z')
}));

describe('Entity Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateWithMetadata', () => {
    it('should update entity with current timestamp', () => {
      const entity: EntityWithMetadata = {
        name: 'Test',
        metadata: { lastModified: '2023-01-01T00:00:00.000Z' }
      };
      
      const result = updateWithMetadata(entity, { name: 'Updated' });
      
      expect(result).toEqual({
        name: 'Updated',
        metadata: { lastModified: '2024-01-01T00:00:00.000Z' }
      });
    });

    it('should preserve existing metadata properties', () => {
      const entity: EntityWithMetadata = {
        name: 'Test',
        metadata: { 
          lastModified: '2023-01-01T00:00:00.000Z',
          isDeleted: true 
        }
      };
      
      const result = updateWithMetadata(entity, { name: 'Updated' });
      
      expect(result.metadata.isDeleted).toBe(true);
    });
  });

  describe('softDelete', () => {
    it('should mark entity as deleted', () => {
      const entity: EntityWithMetadata = {
        name: 'Test',
        metadata: { lastModified: '2023-01-01T00:00:00.000Z' }
      };
      
      const result = softDelete(entity);
      
      expect(result.metadata.isDeleted).toBe(true);
      expect(result.metadata.lastModified).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('restore', () => {
    it('should set isDeleted flag to false', () => {
      const entity: EntityWithMetadata = {
        name: 'Test',
        metadata: { 
          lastModified: '2023-01-01T00:00:00.000Z',
          isDeleted: true 
        }
      };
      
      const result = restore(entity);
      
      expect(result.metadata.isDeleted).toBe(false);
      expect(result.metadata.lastModified).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('updateArrayItemById', () => {
    it('should update item with matching id', () => {
      const items: (EntityWithId & EntityWithMetadata)[] = [
        { id: '1', name: 'Item 1', metadata: { lastModified: '2023-01-01' } },
        { id: '2', name: 'Item 2', metadata: { lastModified: '2023-01-01' } }
      ];
      
      const result = updateArrayItemById(items, '2', item => ({ ...item, name: 'Updated Item 2' }));
      
      expect(result).toHaveLength(2);
      expect(result[1].name).toBe('Updated Item 2');
    });

    it('should not update if id not found', () => {
      const items: (EntityWithId & EntityWithMetadata)[] = [
        { id: '1', name: 'Item 1', metadata: { lastModified: '2023-01-01' } }
      ];
      
      const result = updateArrayItemById(items, 'non-existent', item => ({ ...item, name: 'Updated' }));
      
      expect(result).toEqual(items);
      expect(result[0].name).toBe('Item 1');
    });

    it('should update item using updater function', () => {
      const items: (EntityWithId & EntityWithMetadata)[] = [
        { id: '1', name: 'Item 1', metadata: { lastModified: '2023-01-01' } }
      ];
      
      const result = updateArrayItemById(items, '1', item => 
        updateWithMetadata(item, { name: 'Updated' }, { skipMetadataUpdate: true })
      );
      
      expect(result[0].name).toBe('Updated');
      expect(result[0].metadata.lastModified).toBe('2023-01-01');
    });
  });

  describe('updateArrayItem', () => {
    it('should update item matching predicate', () => {
      const items = [
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 }
      ];
      
      const result = updateArrayItem(
        items,
        item => item.value === 20,
        item => ({ ...item, value: 25 })
      );
      
      expect(result[1].value).toBe(25);
    });
  });

  describe('removeArrayItemById', () => {
    it('should remove item with matching id', () => {
      const items: EntityWithId[] = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];
      
      const result = removeArrayItemById(items, '1');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('removeArrayItem', () => {
    it('should remove items matching predicate', () => {
      const items = [
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 },
        { name: 'Item 3', value: 30 }
      ];
      
      const result = removeArrayItem(items, item => item.value > 15);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Item 1');
    });
  });

  describe('addToArray', () => {
    it('should add item to array', () => {
      const items = ['a', 'b'];
      const result = addToArray(items, 'c');
      
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should add item at start when specified', () => {
      const items = ['a', 'b', 'c'];
      const result = addToArray(items, 'x', { position: 'start' });
      
      expect(result).toEqual(['x', 'a', 'b', 'c']);
    });
  });

  describe('moveArrayItem', () => {
    it('should move item to new position', () => {
      const items = ['a', 'b', 'c', 'd'];
      const result = moveArrayItem(items, 0, 2);
      
      expect(result).toEqual(['b', 'c', 'a', 'd']);
    });

    it('should handle moving to end', () => {
      const items = ['a', 'b', 'c'];
      const result = moveArrayItem(items, 0, 2);
      
      expect(result).toEqual(['b', 'c', 'a']);
    });

    it('should return new array if indices are equal', () => {
      const items = ['a', 'b', 'c'];
      const result = moveArrayItem(items, 1, 1);
      
      expect(result).toEqual(items);
      expect(result).not.toBe(items); // Returns a new array
    });
  });

  describe('updateNested', () => {
    it('should update nested array items', () => {
      const entity = {
        name: 'Test',
        metadata: { lastModified: '2023-01-01' },
        items: [
          { id: '1', value: 'light' },
          { id: '2', value: 'dark' }
        ]
      };
      
      const result = updateNested(
        entity, 
        'items', 
        item => item.id === '1',
        item => ({ ...item, value: 'updated' })
      );
      
      expect(result.items[0].value).toBe('updated');
      expect(result.items[1].value).toBe('dark');
      expect(result.metadata.lastModified).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('batchUpdate', () => {
    it('should update multiple items', () => {
      const items: (EntityWithId & EntityWithMetadata)[] = [
        { id: '1', name: 'Item 1', metadata: { lastModified: '2023-01-01' } },
        { id: '2', name: 'Item 2', metadata: { lastModified: '2023-01-01' } },
        { id: '3', name: 'Item 3', metadata: { lastModified: '2023-01-01' } }
      ];
      
      const updates = [
        { id: '1', changes: { name: 'Updated 1' } },
        { id: '3', changes: { name: 'Updated 3' } }
      ];
      
      const result = batchUpdate(items, updates);
      
      expect(result[0].name).toBe('Updated 1');
      expect(result[1].name).toBe('Item 2');
      expect(result[2].name).toBe('Updated 3');
    });
  });

  describe('createEntity', () => {
    it('should create entity with metadata', () => {
      const result = createEntity({ name: 'New Entity' });
      
      expect(result.name).toBe('New Entity');
      expect(result.metadata.lastModified).toBe('2024-01-01T00:00:00.000Z');
      expect(result.metadata.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.metadata.version).toBe(1);
      expect(result.metadata.isDeleted).toBe(false);
    });

    it('should merge provided metadata', () => {
      const result = createEntity(
        { name: 'New Entity' },
        { isDeleted: true }
      );
      
      expect(result.metadata.lastModified).toBe('2024-01-01T00:00:00.000Z');
      expect(result.metadata.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.metadata.version).toBe(1);
      expect(result.metadata.isDeleted).toBe(true); // Overrides default
    });
  });

  describe('entityExists', () => {
    it('should check if entity exists by id', () => {
      const items: EntityWithId[] = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];
      
      expect(entityExists(items, '2')).toBe(true);
      expect(entityExists(items, '3')).toBe(false);
    });
  });

  describe('findEntityById', () => {
    it('should find entity by id', () => {
      const items: EntityWithId[] = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];
      
      const result = findEntityById(items, '2');
      expect(result?.name).toBe('Item 2');
    });

    it('should return undefined if not found', () => {
      const items: EntityWithId[] = [{ id: '1', name: 'Item 1' }];
      
      const result = findEntityById(items, 'non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('sortByMetadata', () => {
    it('should sort by lastModified descending by default', () => {
      const items: EntityWithMetadata[] = [
        { name: 'A', metadata: { lastModified: '2023-01-01' } as any },
        { name: 'B', metadata: { lastModified: '2023-03-01' } as any },
        { name: 'C', metadata: { lastModified: '2023-02-01' } as any }
      ];
      
      const result = sortByMetadata(items);
      
      expect(result[0].name).toBe('B');
      expect(result[1].name).toBe('C');
      expect(result[2].name).toBe('A');
    });

    it('should sort ascending when specified', () => {
      const items: EntityWithMetadata[] = [
        { name: 'A', metadata: { lastModified: '2023-01-01' } as any },
        { name: 'B', metadata: { lastModified: '2023-03-01' } as any }
      ];
      
      const result = sortByMetadata(items, 'lastModified', 'asc');
      
      expect(result[0].name).toBe('A');
      expect(result[1].name).toBe('B');
    });
  });

  describe('filterActive', () => {
    it('should filter out deleted items', () => {
      const items: EntityWithMetadata[] = [
        { name: 'A', metadata: { lastModified: '2023-01-01' } },
        { name: 'B', metadata: { lastModified: '2023-01-01', isDeleted: true } },
        { name: 'C', metadata: { lastModified: '2023-01-01' } }
      ];
      
      const result = filterActive(items);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('A');
      expect(result[1].name).toBe('C');
    });
  });

  describe('filterDeleted', () => {
    it('should filter only deleted items', () => {
      const items: EntityWithMetadata[] = [
        { name: 'A', metadata: { lastModified: '2023-01-01' } },
        { name: 'B', metadata: { lastModified: '2023-01-01', isDeleted: true } },
        { name: 'C', metadata: { lastModified: '2023-01-01', isDeleted: true } }
      ];
      
      const result = filterDeleted(items);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('B');
      expect(result[1].name).toBe('C');
    });
  });
});