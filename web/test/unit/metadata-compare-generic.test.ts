import { describe, it, expect, vi } from 'vitest';
import { compareArraysByName } from '../../src/lib/utils/metadata';

describe('Generic Array Comparison Function', () => {
  describe('compareArraysByName', () => {
    interface TestItem {
      name: string;
      value: number;
      children?: TestItem[];
    }

    const getName = (item: TestItem) => item.name;
    const compareItem = (a: TestItem, b: TestItem): boolean => {
      return a.name === b.name && a.value === b.value;
    };

    it('should return true for identical arrays', () => {
      const arr1: TestItem[] = [
        { name: 'A', value: 1 },
        { name: 'B', value: 2 }
      ];
      const arr2: TestItem[] = [
        { name: 'A', value: 1 },
        { name: 'B', value: 2 }
      ];
      
      expect(compareArraysByName(arr1, arr2, getName, compareItem)).toBe(true);
    });

    it('should return false for arrays of different lengths', () => {
      const arr1: TestItem[] = [
        { name: 'A', value: 1 },
        { name: 'B', value: 2 }
      ];
      const arr2: TestItem[] = [
        { name: 'A', value: 1 }
      ];
      
      expect(compareArraysByName(arr1, arr2, getName, compareItem)).toBe(false);
    });

    it('should handle arrays in different order', () => {
      const arr1: TestItem[] = [
        { name: 'B', value: 2 },
        { name: 'A', value: 1 }
      ];
      const arr2: TestItem[] = [
        { name: 'A', value: 1 },
        { name: 'B', value: 2 }
      ];
      
      expect(compareArraysByName(arr1, arr2, getName, compareItem)).toBe(true);
    });

    it('should return false when content differs', () => {
      const arr1: TestItem[] = [
        { name: 'A', value: 1 },
        { name: 'B', value: 2 }
      ];
      const arr2: TestItem[] = [
        { name: 'A', value: 1 },
        { name: 'B', value: 3 } // Different value
      ];
      
      expect(compareArraysByName(arr1, arr2, getName, compareItem)).toBe(false);
    });

    it('should handle empty arrays', () => {
      const arr1: TestItem[] = [];
      const arr2: TestItem[] = [];
      
      expect(compareArraysByName(arr1, arr2, getName, compareItem)).toBe(true);
    });

    it('should use the comparator function for deep comparison', () => {
      const comparatorSpy = vi.fn((a: TestItem, b: TestItem) => {
        return a.name === b.name && a.value === b.value;
      });
      
      const arr1: TestItem[] = [{ name: 'A', value: 1 }];
      const arr2: TestItem[] = [{ name: 'A', value: 1 }];
      
      compareArraysByName(arr1, arr2, getName, comparatorSpy);
      
      expect(comparatorSpy).toHaveBeenCalledTimes(1);
      expect(comparatorSpy).toHaveBeenCalledWith(
        { name: 'A', value: 1 },
        { name: 'A', value: 1 }
      );
    });

    it('should handle complex nested structures', () => {
      const compareWithChildren = (a: TestItem, b: TestItem): boolean => {
        if (a.name !== b.name || a.value !== b.value) {
          return false;
        }
        
        const aChildren = a.children || [];
        const bChildren = b.children || [];
        
        if (aChildren.length !== bChildren.length) {
          return false;
        }
        
        return compareArraysByName(aChildren, bChildren, getName, compareWithChildren);
      };
      
      const arr1: TestItem[] = [
        {
          name: 'Parent',
          value: 1,
          children: [
            { name: 'Child A', value: 10 },
            { name: 'Child B', value: 20 }
          ]
        }
      ];
      
      const arr2: TestItem[] = [
        {
          name: 'Parent',
          value: 1,
          children: [
            { name: 'Child B', value: 20 },
            { name: 'Child A', value: 10 }
          ]
        }
      ];
      
      expect(compareArraysByName(arr1, arr2, getName, compareWithChildren)).toBe(true);
    });

    it('should handle arrays with duplicate names by position', () => {
      const arr1: TestItem[] = [
        { name: 'A', value: 1 },
        { name: 'A', value: 2 },
        { name: 'B', value: 3 }
      ];
      const arr2: TestItem[] = [
        { name: 'A', value: 1 },
        { name: 'A', value: 2 },
        { name: 'B', value: 3 }
      ];
      
      expect(compareArraysByName(arr1, arr2, getName, compareItem)).toBe(true);
    });

    it('should return false for arrays with same names but different order of duplicates', () => {
      const arr1: TestItem[] = [
        { name: 'A', value: 1 },
        { name: 'A', value: 2 },
        { name: 'B', value: 3 }
      ];
      const arr2: TestItem[] = [
        { name: 'A', value: 2 }, // Different order of 'A' items
        { name: 'A', value: 1 },
        { name: 'B', value: 3 }
      ];
      
      // Should be false because after sorting by name, the values at each position differ
      expect(compareArraysByName(arr1, arr2, getName, compareItem)).toBe(false);
    });
  });
});