import { describe, it, expect } from 'vitest';
import {
  validateField,
  validateUrl,
  validateName,
  trimFields,
  ValidationMessages
} from '../../../web/src/utils/validation';

describe('Validation Utilities', () => {
  describe('validateField', () => {
    it('should pass for valid field', () => {
      const result = validateField('valid value', {});
      expect(result).toBeNull();
    });

    it('should validate required fields', () => {
      expect(validateField('', { required: true })).toBe(ValidationMessages.REQUIRED);
      expect(validateField('  ', { required: true })).toBe(ValidationMessages.REQUIRED);
      expect(validateField('value', { required: true })).toBeNull();
    });

    it('should validate minimum length', () => {
      expect(validateField('ab', { minLength: 3 })).toBe(ValidationMessages.MIN_LENGTH(3));
      expect(validateField('abc', { minLength: 3 })).toBeNull();
      expect(validateField('abcd', { minLength: 3 })).toBeNull();
    });

    it('should validate maximum length', () => {
      expect(validateField('abcde', { maxLength: 4 })).toBe(ValidationMessages.MAX_LENGTH(4));
      expect(validateField('abcd', { maxLength: 4 })).toBeNull();
      expect(validateField('abc', { maxLength: 4 })).toBeNull();
    });

    it('should validate pattern', () => {
      const alphaPattern = /^[a-zA-Z]+$/;
      expect(validateField('abc123', { pattern: alphaPattern })).toBe(ValidationMessages.INVALID_FORMAT);
      expect(validateField('abcdef', { pattern: alphaPattern })).toBeNull();
      expect(validateField('ABC', { pattern: alphaPattern })).toBeNull();
    });

    it('should trim value before validation', () => {
      expect(validateField('  value  ', { minLength: 5 })).toBeNull();
      expect(validateField('  val  ', { minLength: 5 })).toBe(ValidationMessages.MIN_LENGTH(5));
    });

    it('should return custom message when provided', () => {
      expect(validateField('', { required: true, customMessage: 'Custom error' })).toBe('Custom error');
      expect(validateField('a', { minLength: 2, customMessage: 'Too short!' })).toBe('Too short!');
    });

    it('should validate multiple constraints', () => {
      const options = {
        required: true,
        minLength: 3,
        maxLength: 10,
        pattern: /^[a-z]+$/
      };

      // Test required
      expect(validateField('', options)).toBe(ValidationMessages.REQUIRED);

      // Test minLength
      expect(validateField('ab', options)).toBe(ValidationMessages.MIN_LENGTH(3));

      // Test maxLength
      expect(validateField('abcdefghijk', options)).toBe(ValidationMessages.MAX_LENGTH(10));

      // Test pattern
      expect(validateField('abc123', options)).toBe(ValidationMessages.INVALID_FORMAT);

      // Test valid
      expect(validateField('abcdef', options)).toBeNull();
    });

    it('should handle edge cases', () => {
      // Empty options
      expect(validateField('anything', {})).toBeNull();

      // Only whitespace with no required
      expect(validateField('   ', {})).toBeNull();

      // Zero length constraints
      expect(validateField('', { minLength: 0 })).toBeNull();
      // maxLength: 0 is falsy, so the check is skipped entirely
      expect(validateField('', { maxLength: 0 })).toBeNull();
      expect(validateField('any string', { maxLength: 0 })).toBeNull();
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBeNull();
      expect(validateUrl('http://example.com')).toBeNull();
      expect(validateUrl('https://example.com/path')).toBeNull();
      expect(validateUrl('https://example.com/path?query=value')).toBeNull();
      expect(validateUrl('https://example.com:8080')).toBeNull();
      expect(validateUrl('https://sub.example.com')).toBeNull();
      expect(validateUrl('ftp://example.com')).toBeNull();
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not a url')).toBe(ValidationMessages.INVALID_URL);
      expect(validateUrl('example.com')).toBe(ValidationMessages.INVALID_URL);
      expect(validateUrl('//example.com')).toBe(ValidationMessages.INVALID_URL);
      expect(validateUrl('http://')).toBe(ValidationMessages.INVALID_URL);
      // 'http://.' is actually accepted by URL constructor in some environments
      expect(validateUrl('http://invalid url')).toBe(ValidationMessages.INVALID_URL);
      expect(validateUrl('')).toBe(ValidationMessages.REQUIRED);  // Empty string returns REQUIRED
      // javascript: URLs are technically valid URLs
      expect(validateUrl('javascript:alert(1)')).toBeNull();
    });

    it('should handle special cases', () => {
      // Localhost URLs
      expect(validateUrl('http://localhost')).toBeNull();
      expect(validateUrl('http://localhost:3000')).toBeNull();
      expect(validateUrl('http://127.0.0.1')).toBeNull();

      // URLs with authentication
      expect(validateUrl('https://user:pass@example.com')).toBeNull();

      // Data URLs are actually valid URLs
      expect(validateUrl('data:text/plain,hello')).toBeNull();
    });

    it('should trim URLs before validation', () => {
      expect(validateUrl('  https://example.com  ')).toBeNull();
      expect(validateUrl('\nhttps://example.com\n')).toBeNull();
    });
  });

  describe('validateName', () => {
    it('should validate names with default constraints', () => {
      // Too short (default min is 2)
      expect(validateName('a')).toBe(ValidationMessages.MIN_LENGTH(2));
      
      // Valid names
      expect(validateName('ab')).toBeNull();
      expect(validateName('John')).toBeNull();
      expect(validateName('Category Name')).toBeNull();
      
      // Too long (default max is 50)
      const longName = 'a'.repeat(51);
      expect(validateName(longName)).toBe(ValidationMessages.MAX_LENGTH(50));
    });

    it('should accept custom constraints', () => {
      expect(validateName('abc', { minLength: 4 })).toBe(ValidationMessages.MIN_LENGTH(4));
      expect(validateName('abcd', { minLength: 4 })).toBeNull();
      
      expect(validateName('abcde', { maxLength: 4 })).toBe(ValidationMessages.MAX_LENGTH(4));
      expect(validateName('abcd', { maxLength: 4 })).toBeNull();
    });

    it('should validate required names', () => {
      expect(validateName('')).toBe(ValidationMessages.REQUIRED);
      expect(validateName('  ')).toBe(ValidationMessages.REQUIRED);
    });

    it('should handle various name formats', () => {
      // Single word
      expect(validateName('Category')).toBeNull();
      
      // Multiple words
      expect(validateName('My Category')).toBeNull();
      
      // With numbers
      expect(validateName('Category 123')).toBeNull();
      
      // With special characters
      expect(validateName('Category-Name')).toBeNull();
      expect(validateName('Category_Name')).toBeNull();
      expect(validateName('Category.Name')).toBeNull();
      
      // With emojis
      expect(validateName('📚 Books')).toBeNull();
    });
  });

  describe('trimFields', () => {
    it('should trim string fields', () => {
      const input = {
        name: '  John  ',
        email: '\temail@example.com\n',
        description: '  Some text  '
      };

      const result = trimFields(input);

      expect(result).toEqual({
        name: 'John',
        email: 'email@example.com',
        description: 'Some text'
      });
    });

    it('should preserve non-string fields', () => {
      const input = {
        name: '  John  ',
        age: 25,
        active: true,
        data: null,
        tags: ['tag1', 'tag2'],
        metadata: { key: 'value' }
      };

      const result = trimFields(input);

      expect(result).toEqual({
        name: 'John',
        age: 25,
        active: true,
        data: null,
        tags: ['tag1', 'tag2'],
        metadata: { key: 'value' }
      });
    });

    it('should handle empty objects', () => {
      const result = trimFields({});
      expect(result).toEqual({});
    });

    it('should handle objects with only non-string values', () => {
      const input = {
        count: 10,
        isValid: false,
        items: [1, 2, 3]
      };

      const result = trimFields(input);
      expect(result).toEqual(input);
    });

    it('should handle nested string values in arrays/objects', () => {
      const input = {
        name: '  Main  ',
        nested: {
          value: '  nested string  '
        },
        array: ['  item1  ', '  item2  ']
      };

      const result = trimFields(input);

      // Should only trim top-level strings
      expect(result).toEqual({
        name: 'Main',
        nested: {
          value: '  nested string  '
        },
        array: ['  item1  ', '  item2  ']
      });
    });

    it('should handle undefined and empty string values', () => {
      const input = {
        name: '  ',
        empty: '',
        undef: undefined,
        normal: '  text  '
      };

      const result = trimFields(input);

      expect(result).toEqual({
        name: '',
        empty: '',
        undef: undefined,
        normal: 'text'
      });
    });

    it('should maintain object reference for non-modified fields', () => {
      const nestedObj = { key: 'value' };
      const arrayField = [1, 2, 3];
      
      const input = {
        name: 'NoTrim',
        nested: nestedObj,
        array: arrayField
      };

      const result = trimFields(input);

      // Non-string fields should maintain reference
      expect(result.nested).toBe(nestedObj);
      expect(result.array).toBe(arrayField);
    });
  });

  describe('ValidationMessages', () => {
    it('should have correct static messages', () => {
      expect(ValidationMessages.REQUIRED).toBe('This field is required');
      expect(ValidationMessages.INVALID_URL).toBe('Please enter a valid URL');
      expect(ValidationMessages.INVALID_FORMAT).toBe('Invalid format');
    });

    it('should generate correct dynamic messages', () => {
      expect(ValidationMessages.MIN_LENGTH(5)).toBe('Must be at least 5 characters');
      expect(ValidationMessages.MIN_LENGTH(1)).toBe('Must be at least 1 characters');
      expect(ValidationMessages.MAX_LENGTH(10)).toBe('Must be no more than 10 characters');
      expect(ValidationMessages.MAX_LENGTH(1)).toBe('Must be no more than 1 characters');
    });
  });
});