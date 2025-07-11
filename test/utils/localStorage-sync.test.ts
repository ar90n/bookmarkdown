import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLocalLastSynced, setLocalLastSynced, clearLocalLastSynced } from '../../web/src/lib/utils/metadata';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Replace the global localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('localStorage Sync Timestamp Management', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should return EPOCH timestamp when no lastSynced is stored', () => {
    const gistId = 'test-gist-123';
    const result = getLocalLastSynced(gistId);
    
    expect(result).toBe('1970-01-01T00:00:00.000Z');
  });

  it('should store and retrieve lastSynced timestamp', () => {
    const gistId = 'test-gist-123';
    const timestamp = '2023-01-15T10:30:00Z';
    
    setLocalLastSynced(gistId, timestamp);
    const result = getLocalLastSynced(gistId);
    
    expect(result).toBe(timestamp);
  });

  it('should use current timestamp when no timestamp provided to setLocalLastSynced', () => {
    const gistId = 'test-gist-123';
    const beforeSet = new Date().toISOString();
    
    setLocalLastSynced(gistId);
    
    const afterSet = new Date().toISOString();
    const result = getLocalLastSynced(gistId);
    
    // The stored timestamp should be between beforeSet and afterSet
    expect(new Date(result).getTime()).toBeGreaterThanOrEqual(new Date(beforeSet).getTime());
    expect(new Date(result).getTime()).toBeLessThanOrEqual(new Date(afterSet).getTime());
  });

  it('should handle multiple gist IDs independently', () => {
    const gistId1 = 'gist-work-123';
    const gistId2 = 'gist-personal-456';
    const timestamp1 = '2023-01-15T10:00:00Z';
    const timestamp2 = '2023-01-16T14:30:00Z';
    
    setLocalLastSynced(gistId1, timestamp1);
    setLocalLastSynced(gistId2, timestamp2);
    
    expect(getLocalLastSynced(gistId1)).toBe(timestamp1);
    expect(getLocalLastSynced(gistId2)).toBe(timestamp2);
  });

  it('should clear specific gist lastSynced', () => {
    const gistId1 = 'gist-work-123';
    const gistId2 = 'gist-personal-456';
    const timestamp = '2023-01-15T10:00:00Z';
    
    setLocalLastSynced(gistId1, timestamp);
    setLocalLastSynced(gistId2, timestamp);
    
    clearLocalLastSynced(gistId1);
    
    expect(getLocalLastSynced(gistId1)).toBe('1970-01-01T00:00:00.000Z');
    expect(getLocalLastSynced(gistId2)).toBe(timestamp);
  });

  it('should handle localStorage errors gracefully', () => {
    const gistId = 'test-gist-123';
    
    // Mock localStorage.getItem to throw an error
    const originalGetItem = localStorageMock.getItem;
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    localStorageMock.getItem = () => {
      throw new Error('localStorage error');
    };
    
    const result = getLocalLastSynced(gistId);
    
    expect(result).toBe('1970-01-01T00:00:00.000Z');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to read lastSynced from localStorage:', expect.any(Error));
    
    // Restore
    localStorageMock.getItem = originalGetItem;
    consoleWarnSpy.mockRestore();
  });

  it('should use correct localStorage key format', () => {
    const gistId = 'abc123def456';
    const timestamp = '2023-01-15T10:00:00Z';
    
    setLocalLastSynced(gistId, timestamp);
    
    // Check that the key was stored with the correct format
    const expectedKey = `bookmarkdown_last_synced_${gistId}`;
    expect(localStorageMock.getItem(expectedKey)).toBe(timestamp);
  });
});