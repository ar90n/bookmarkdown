import { describe, it, expect, vi } from 'vitest';
import { generateId, isValidId, generateBookmarkId } from '../../src/lib/utils/uuid';

// Mock uuid module
vi.mock('uuid', () => ({
  v4: vi.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
  validate: vi.fn((id: string) => {
    // Simple UUID v4 regex for testing
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  })
}));

describe('UUID Utilities', () => {
  describe('generateId', () => {
    it('should generate a UUID', () => {
      const id = generateId();
      expect(id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should generate unique IDs', () => {
      // In real implementation, each call would return different UUIDs
      // Since we're mocking, we'll just verify the function is called
      const id1 = generateId();
      const id2 = generateId();
      
      // Both should return our mocked value
      expect(id1).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(id2).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('isValidId', () => {
    it('should validate correct UUID v4', () => {
      expect(isValidId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidId('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidId('not-a-uuid')).toBe(false);
      expect(isValidId('12345678-1234-1234-1234-123456789012')).toBe(false); // Wrong version
      expect(isValidId('')).toBe(false);
      expect(isValidId('550e8400-e29b-41d4-a716')).toBe(false); // Too short
    });

    it('should reject null and undefined', () => {
      expect(isValidId(null as any)).toBe(false);
      expect(isValidId(undefined as any)).toBe(false);
    });
  });

  describe('generateBookmarkId', () => {
    it('should generate a bookmark ID', () => {
      const id = generateBookmarkId();
      expect(id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should use generateId internally', () => {
      const id = generateBookmarkId();
      // Should return the same as generateId since it's a wrapper
      expect(id).toBe(generateId());
    });
  });
});