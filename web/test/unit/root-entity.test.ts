import { describe, it, expect } from 'vitest';
import { RootEntity } from '../../src/lib/entities/root-entity.js';

describe('RootEntity', () => {
  describe('creation', () => {
    it('should create an empty RootEntity', () => {
      const entity = RootEntity.create();
      
      expect(entity.version).toBe(1);
      expect(entity.categories).toEqual([]);
    });
    
    it('should create RootEntity from existing Root', () => {
      const root = {
        version: 1 as const,
        categories: [
          {
            name: 'Test Category',
            bundles: []
          }
        ]
      };
      
      const entity = RootEntity.fromRoot(root);
      
      expect(entity.version).toBe(1);
      expect(entity.categories).toHaveLength(1);
      expect(entity.categories[0].name).toBe('Test Category');
    });
    
    it('should convert back to Root', () => {
      const root = {
        version: 1 as const,
        categories: [
          {
            name: 'Test Category',
            bundles: []
          }
        ]
      };
      
      const entity = RootEntity.fromRoot(root);
      const result = entity.toRoot();
      
      expect(result).toEqual(root);
    });
  });
});