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
  
  describe('category operations', () => {
    describe('addCategory', () => {
      it('should add a new category', () => {
        const entity = RootEntity.create();
        const result = entity.addCategory('Test Category');
        
        expect(result.categories).toHaveLength(1);
        expect(result.categories[0].name).toBe('Test Category');
        expect(result.categories[0].bundles).toEqual([]);
      });
      
      it('should create a new instance (immutability)', () => {
        const entity = RootEntity.create();
        const result = entity.addCategory('Test Category');
        
        expect(result).not.toBe(entity);
        expect(entity.categories).toHaveLength(0);
        expect(result.categories).toHaveLength(1);
      });
      
      it('should throw error for duplicate category', () => {
        const entity = RootEntity.create()
          .addCategory('Test Category');
        
        expect(() => entity.addCategory('Test Category'))
          .toThrow('Category "Test Category" already exists');
      });
    });
    
    describe('removeCategory', () => {
      it('should remove an existing category', () => {
        const entity = RootEntity.create()
          .addCategory('Category 1')
          .addCategory('Category 2');
        
        const result = entity.removeCategory('Category 1');
        
        expect(result.categories).toHaveLength(1);
        expect(result.categories[0].name).toBe('Category 2');
      });
      
      it('should throw error for non-existent category', () => {
        const entity = RootEntity.create();
        
        expect(() => entity.removeCategory('Non-existent'))
          .toThrow('Category "Non-existent" not found');
      });
    });
    
    describe('renameCategory', () => {
      it('should rename an existing category', () => {
        const entity = RootEntity.create()
          .addCategory('Old Name');
        
        const result = entity.renameCategory('Old Name', 'New Name');
        
        expect(result.categories).toHaveLength(1);
        expect(result.categories[0].name).toBe('New Name');
      });
      
      it('should throw error for non-existent category', () => {
        const entity = RootEntity.create();
        
        expect(() => entity.renameCategory('Non-existent', 'New Name'))
          .toThrow('Category "Non-existent" not found');
      });
      
      it('should throw error if new name already exists', () => {
        const entity = RootEntity.create()
          .addCategory('Category 1')
          .addCategory('Category 2');
        
        expect(() => entity.renameCategory('Category 1', 'Category 2'))
          .toThrow('Category "Category 2" already exists');
      });
      
      it('should allow renaming to the same name', () => {
        const entity = RootEntity.create()
          .addCategory('Category 1');
        
        const result = entity.renameCategory('Category 1', 'Category 1');
        
        expect(result.categories[0].name).toBe('Category 1');
      });
    });
  });
});