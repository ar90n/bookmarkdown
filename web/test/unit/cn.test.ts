import { describe, it, expect } from 'vitest';
import { cn } from '../../src/utils/cn';

describe('cn utility', () => {
  it('should join multiple class names', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
  });

  it('should handle object syntax', () => {
    expect(cn({
      'foo': true,
      'bar': false,
      'baz': true
    })).toBe('foo baz');
  });

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('should handle mixed inputs', () => {
    expect(cn(
      'foo',
      ['bar', 'baz'],
      { qux: true, quux: false },
      true && 'corge'
    )).toBe('foo bar baz qux corge');
  });

  it('should filter out undefined, null, and false values', () => {
    expect(cn('foo', undefined, null, false, 'bar', 0, '')).toBe('foo bar');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('should handle single class', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('should handle classes with whitespace', () => {
    // clsx preserves the whitespace within individual class strings
    expect(cn('  foo  ', '  bar  ')).toBe('  foo     bar  ');
  });

  it('should handle nested arrays', () => {
    expect(cn(['foo', ['bar', 'baz']], 'qux')).toBe('foo bar baz qux');
  });

  it('should handle dynamic conditions', () => {
    const isActive = true;
    const isDisabled = false;
    
    expect(cn(
      'button',
      isActive && 'active',
      isDisabled && 'disabled'
    )).toBe('button active');
  });

  it('should handle number values', () => {
    expect(cn('foo', 123, 'bar')).toBe('foo 123 bar');
  });
});