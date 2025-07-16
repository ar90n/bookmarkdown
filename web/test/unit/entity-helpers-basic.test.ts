import { describe, it, expect, beforeEach } from 'vitest';
import {
  updateWithMetadata,
  softDelete,
  restore,
  updateArrayItemById,
  removeArrayItemById,
  addToArray,
  moveArrayItem,
  createEntity,
  entityExists,
  findEntityById,
  sortByMetadata,
  filterActive,
  filterDeleted
} from '../../src/utils/entityHelpers';

interface TestEntity {
  id: string;
  name: string;
  metadata?: {
    lastModified: string;
    isDeleted?: boolean;
  };
}

describe('Entity Helpers Basic', () => {
  describe('updateWithMetadata', () => {
    it('should update entity and metadata', () => {
      const entity: TestEntity = {
        id: '1',
        name: 'Test',
        metadata: { lastModified: '2023-01-01' }
      };

      const updated = updateWithMetadata(entity, { name: 'Updated' });
      
      expect(updated.name).toBe('Updated');
      expect(updated.metadata?.lastModified).not.toBe('2023-01-01');
      expect(new Date(updated.metadata?.lastModified || '').getTime()).toBeGreaterThan(
        new Date('2023-01-01').getTime()
      );
    });
  });

  describe('softDelete and restore', () => {
    it('should soft delete entity', () => {
      const entity: TestEntity = {
        id: '1',
        name: 'Test',
        metadata: { lastModified: '2023-01-01' }
      };

      const deleted = softDelete(entity);
      
      expect(deleted.metadata?.isDeleted).toBe(true);
      expect(deleted.metadata?.lastModified).not.toBe('2023-01-01');
    });

    it('should restore soft deleted entity', () => {
      const entity: TestEntity = {
        id: '1',
        name: 'Test',
        metadata: { 
          lastModified: '2023-01-01',
          isDeleted: true
        }
      };

      const restored = restore(entity);
      
      expect(restored.metadata?.isDeleted).toBe(false);
    });
  });

  describe('Array operations', () => {
    let testArray: TestEntity[];

    beforeEach(() => {
      testArray = [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
        { id: '3', name: 'Third' }
      ];
    });

    it('should update array item by id', () => {
      const updated = updateArrayItemById(testArray, '2', (item) => ({
        ...item,
        name: 'Updated Second'
      }));
      
      expect(updated).toHaveLength(3);
      expect(updated[1].name).toBe('Updated Second');
      expect(updated[0].name).toBe('First'); // Others unchanged
    });

    it('should remove array item by id', () => {
      const removed = removeArrayItemById(testArray, '2');
      
      expect(removed).toHaveLength(2);
      expect(removed.map(e => e.id)).toEqual(['1', '3']);
    });

    it('should add to array', () => {
      const newItem = { id: '4', name: 'Fourth' };
      const added = addToArray(testArray, newItem);
      
      expect(added).toHaveLength(4);
      expect(added[3]).toEqual(newItem);
    });

    it('should move array item', () => {
      const moved = moveArrayItem(testArray, 0, 2);
      
      expect(moved).toHaveLength(3);
      expect(moved.map(e => e.name)).toEqual(['Second', 'Third', 'First']);
    });
  });

  describe('Entity utilities', () => {
    it('should create entity with metadata', () => {
      const entity = createEntity<TestEntity>({
        id: '1',
        name: 'New Entity'
      });
      
      expect(entity.metadata).toBeDefined();
      expect(entity.metadata?.lastModified).toBeDefined();
      expect(entity.metadata?.isDeleted).toBe(false);
    });

    it('should check if entity exists', () => {
      const entities = [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' }
      ];
      
      expect(entityExists(entities, '1')).toBe(true);
      expect(entityExists(entities, '3')).toBe(false);
    });

    it('should find entity by id', () => {
      const entities = [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' }
      ];
      
      const found = findEntityById(entities, '2');
      expect(found?.name).toBe('Second');
      
      const notFound = findEntityById(entities, '3');
      expect(notFound).toBeUndefined();
    });
  });

  describe('Sorting and filtering', () => {
    it('should sort by metadata lastModified', () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'First', metadata: { lastModified: '2023-01-03' } },
        { id: '2', name: 'Second', metadata: { lastModified: '2023-01-01' } },
        { id: '3', name: 'Third', metadata: { lastModified: '2023-01-02' } }
      ];
      
      const sorted = sortByMetadata(entities);
      
      // sortByMetadata sorts by newest first (descending)
      expect(sorted.map(e => e.name)).toEqual(['First', 'Third', 'Second']);
    });

    it('should filter active entities', () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'Active 1', metadata: { lastModified: '2023-01-01' } },
        { id: '2', name: 'Deleted', metadata: { lastModified: '2023-01-01', isDeleted: true } },
        { id: '3', name: 'Active 2', metadata: { lastModified: '2023-01-01' } }
      ];
      
      const active = filterActive(entities);
      
      expect(active).toHaveLength(2);
      expect(active.map(e => e.name)).toEqual(['Active 1', 'Active 2']);
    });

    it('should filter deleted entities', () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'Active', metadata: { lastModified: '2023-01-01' } },
        { id: '2', name: 'Deleted 1', metadata: { lastModified: '2023-01-01', isDeleted: true } },
        { id: '3', name: 'Deleted 2', metadata: { lastModified: '2023-01-01', isDeleted: true } }
      ];
      
      const deleted = filterDeleted(entities);
      
      expect(deleted).toHaveLength(2);
      expect(deleted.map(e => e.name)).toEqual(['Deleted 1', 'Deleted 2']);
    });
  });
});