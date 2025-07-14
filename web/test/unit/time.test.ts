import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime } from '../../src/lib/utils/time';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    // Mock current time to have consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "Never" for null date', () => {
    expect(formatRelativeTime(null)).toBe('Never');
  });

  it('should return "Just now" for dates less than 5 seconds ago', () => {
    const date = new Date('2024-01-15T11:59:57Z'); // 3 seconds ago
    expect(formatRelativeTime(date)).toBe('Just now');
  });

  it('should return seconds for dates less than 1 minute ago', () => {
    const date = new Date('2024-01-15T11:59:30Z'); // 30 seconds ago
    expect(formatRelativeTime(date)).toBe('30 seconds ago');
  });

  it('should return "1 minute ago" for exactly 1 minute', () => {
    const date = new Date('2024-01-15T11:59:00Z'); // 1 minute ago
    expect(formatRelativeTime(date)).toBe('1 minute ago');
  });

  it('should return minutes for dates less than 1 hour ago', () => {
    const date = new Date('2024-01-15T11:30:00Z'); // 30 minutes ago
    expect(formatRelativeTime(date)).toBe('30 minutes ago');
  });

  it('should return "1 hour ago" for exactly 1 hour', () => {
    const date = new Date('2024-01-15T11:00:00Z'); // 1 hour ago
    expect(formatRelativeTime(date)).toBe('1 hour ago');
  });

  it('should return hours for dates less than 24 hours ago', () => {
    const date = new Date('2024-01-15T00:00:00Z'); // 12 hours ago
    expect(formatRelativeTime(date)).toBe('12 hours ago');
  });

  it('should return "Yesterday" for exactly 1 day ago', () => {
    const date = new Date('2024-01-14T12:00:00Z'); // 1 day ago
    expect(formatRelativeTime(date)).toBe('Yesterday');
  });

  it('should return days for dates less than 1 week ago', () => {
    const date = new Date('2024-01-12T12:00:00Z'); // 3 days ago
    expect(formatRelativeTime(date)).toBe('3 days ago');
  });

  it('should return "1 week ago" for exactly 1 week', () => {
    const date = new Date('2024-01-08T12:00:00Z'); // 7 days ago
    expect(formatRelativeTime(date)).toBe('1 week ago');
  });

  it('should return weeks for dates less than 1 month ago', () => {
    const date = new Date('2024-01-01T12:00:00Z'); // 2 weeks ago
    expect(formatRelativeTime(date)).toBe('2 weeks ago');
  });

  it('should return "1 month ago" for exactly 1 month', () => {
    const date = new Date('2023-12-15T12:00:00Z'); // 31 days ago
    expect(formatRelativeTime(date)).toBe('1 month ago');
  });

  it('should return months for dates less than 1 year ago', () => {
    const date = new Date('2023-07-15T12:00:00Z'); // 6 months ago
    expect(formatRelativeTime(date)).toBe('6 months ago');
  });

  it('should return "Over a year ago" for dates more than 1 year ago', () => {
    const date = new Date('2022-01-15T12:00:00Z'); // 2 years ago
    expect(formatRelativeTime(date)).toBe('Over a year ago');
  });
});