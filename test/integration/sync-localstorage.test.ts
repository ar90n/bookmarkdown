import { describe, it, expect, beforeEach } from 'vitest';
import { mergeRoots } from '../../web/src/lib/utils/merge';
import { initializeRootMetadata, getLocalLastSynced, setLocalLastSynced } from '../../web/src/lib/utils/metadata';
import { Root } from '../../web/src/lib/types/bookmark';

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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('End-to-End Sync with localStorage', () => {
  const gistId = 'test-gist-integration';

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should correctly handle device-specific sync behavior', () => {
    // Device A syncs first time (never synced before)
    const deviceALastSynced = getLocalLastSynced(gistId); // Should be EPOCH
    expect(deviceALastSynced).toBe('1970-01-01T00:00:00.000Z');

    // Local root with a bookmark
    const localRoot: Root = initializeRootMetadata({
      version: 1,
      categories: [
        {
          name: 'Test Category',
          bundles: [
            {
              name: 'Test Bundle',
              bookmarks: [
                {
                  id: 'local-bookmark-1',
                  title: 'Local Bookmark',
                  url: 'https://local.com',
                  metadata: {
                    lastModified: '2023-01-10T00:00:00Z'
                  }
                }
              ],
              metadata: {
                lastModified: '2023-01-10T00:00:00Z'
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-10T00:00:00Z'
          }
        }
      ]
    });

    // Remote root is empty (first sync scenario)
    const remoteRoot: Root = initializeRootMetadata({
      version: 1,
      categories: []
    });

    // Merge with device A's lastSynced
    const result = mergeRoots(localRoot, remoteRoot, {
      userLastSynced: deviceALastSynced
    });

    // Should keep local bookmark since device never synced before
    expect(result.mergedRoot.categories).toHaveLength(1);
    expect(result.mergedRoot.categories[0].bundles[0].bookmarks).toHaveLength(1);
    expect(result.mergedRoot.categories[0].bundles[0].bookmarks[0].title).toBe('Local Bookmark');

    // Simulate successful sync for Device A
    setLocalLastSynced(gistId, '2023-01-15T10:00:00Z');
    expect(getLocalLastSynced(gistId)).toBe('2023-01-15T10:00:00Z');
  });

  it('should handle deletion detection correctly for different devices', () => {
    // Set up: Device A synced on Jan 10, Device B synced on Jan 12
    setLocalLastSynced(gistId, '2023-01-10T00:00:00Z'); // Device A

    // Local root (Device A) has a bookmark
    const localRoot: Root = initializeRootMetadata({
      version: 1,
      categories: [
        {
          name: 'Test Category',
          bundles: [
            {
              name: 'Test Bundle',
              bookmarks: [
                {
                  id: 'bookmark-to-delete',
                  title: 'Bookmark To Delete',
                  url: 'https://delete-me.com',
                  metadata: {
                    lastModified: '2023-01-05T00:00:00Z' // Old bookmark
                  }
                }
              ],
              metadata: {
                lastModified: '2023-01-13T00:00:00Z' // Bundle modified after Device A's lastSync
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-13T00:00:00Z'
          }
        }
      ]
    });

    // Remote root (reflects deletion by Device B)
    const remoteRoot: Root = initializeRootMetadata({
      version: 1,
      categories: [
        {
          name: 'Test Category',
          bundles: [
            {
              name: 'Test Bundle',
              bookmarks: [], // Bookmark was deleted
              metadata: {
                lastModified: '2023-01-13T00:00:00Z' // Modified after Device A's lastSync
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-13T00:00:00Z'
          }
        }
      ]
    });

    // Device A sync with its own lastSynced time
    const deviceALastSynced = getLocalLastSynced(gistId);
    const result = mergeRoots(localRoot, remoteRoot, {
      userLastSynced: deviceALastSynced
    });

    // The bookmark should be deleted because:
    // - Remote bundle was modified (2023-01-13) after Device A's last sync (2023-01-10)
    // - Bookmark is missing from remote
    expect(result.mergedRoot.categories).toHaveLength(1);
    expect(result.mergedRoot.categories[0].bundles).toHaveLength(1);
    expect(result.mergedRoot.categories[0].bundles[0].bookmarks).toHaveLength(0);
  });

  it('should keep separate sync timestamps for different gists', () => {
    const gistId1 = 'work-gist-123';
    const gistId2 = 'personal-gist-456';
    
    // Simulate syncing with different gists at different times
    setLocalLastSynced(gistId1, '2023-01-10T00:00:00Z');
    setLocalLastSynced(gistId2, '2023-01-15T00:00:00Z');
    
    // Each gist should have its own independent timestamp
    expect(getLocalLastSynced(gistId1)).toBe('2023-01-10T00:00:00Z');
    expect(getLocalLastSynced(gistId2)).toBe('2023-01-15T00:00:00Z');
    
    // Updating one shouldn't affect the other
    setLocalLastSynced(gistId1, '2023-01-20T00:00:00Z');
    
    expect(getLocalLastSynced(gistId1)).toBe('2023-01-20T00:00:00Z');
    expect(getLocalLastSynced(gistId2)).toBe('2023-01-15T00:00:00Z'); // Unchanged
  });
});