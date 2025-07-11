import { describe, it, expect } from 'vitest';
import { mergeRoots } from '../../web/src/lib/utils/merge';
import { initializeRootMetadata } from '../../web/src/lib/utils/metadata';
import { Root } from '../../web/src/lib/types/bookmark';

describe('Transactional Merge Algorithm', () => {
  it('should merge bookmarks based on content, not ID (fixes duplication issue)', () => {
    // Create local root with initialized metadata
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
                  id: 'local-id-1',
                  title: 'Shared Bookmark',
                  url: 'https://example.com',
                  metadata: {
                    lastModified: '2023-01-01T00:00:00Z',
                    lastSynced: '2023-01-01T00:00:00Z'
                  }
                }
              ],
              metadata: {
                lastModified: '2023-01-01T00:00:00Z',
                lastSynced: '2023-01-01T00:00:00Z'
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-01T00:00:00Z',
            lastSynced: '2023-01-01T00:00:00Z'
          }
        }
      ]
    });

    // Create remote root with same content but different ID
    const remoteRoot: Root = initializeRootMetadata({
      version: 1,
      categories: [
        {
          name: 'Test Category',
          bundles: [
            {
              name: 'Test Bundle',
              bookmarks: [
                {
                  id: 'remote-id-2', // Different ID but same content (URL + title)
                  title: 'Shared Bookmark',
                  url: 'https://example.com',
                  metadata: {
                    lastModified: '2023-01-01T00:00:00Z',
                    lastSynced: '2023-01-01T00:00:00Z'
                  }
                }
              ],
              metadata: {
                lastModified: '2023-01-01T00:00:00Z',
                lastSynced: '2023-01-01T00:00:00Z'
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-01T00:00:00Z',
            lastSynced: '2023-01-01T00:00:00Z'
          }
        }
      ]
    });

    // Test merge
    const result = mergeRoots(localRoot, remoteRoot, {
      userLastSynced: '2023-01-01T00:00:00Z'
    });
    
    expect(result.hasConflicts).toBe(false);
    expect(result.mergedRoot.categories).toHaveLength(1);
    expect(result.mergedRoot.categories[0].bundles).toHaveLength(1);
    
    // The key test: should have only 1 bookmark, not 2 duplicates
    const mergedBookmarks = result.mergedRoot.categories[0].bundles[0].bookmarks;
    expect(mergedBookmarks).toHaveLength(1);
    expect(mergedBookmarks[0].title).toBe('Shared Bookmark');
    expect(mergedBookmarks[0].url).toBe('https://example.com');
  });

  it('should support deletion detection based on container timestamps', () => {
    // Local root has a bookmark that was previously synced
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
                  title: 'Bookmark to Delete',
                  url: 'https://delete-me.com',
                  metadata: {
                    lastModified: '2023-01-01T00:00:00Z',
                    lastSynced: '2023-01-01T00:00:00Z'
                  }
                }
              ],
              metadata: {
                lastModified: '2023-01-01T00:00:00Z',
                lastSynced: '2023-01-01T00:00:00Z'
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-01T00:00:00Z',
            lastSynced: '2023-01-01T00:00:00Z'
          }
        }
      ]
    });

    // Set lastSynced to indicate this was previously synced
    localRoot.metadata.lastSynced = '2023-01-01T00:00:00Z';

    // Remote root has bundle modified after lastSynced but bookmark is missing (deleted)
    const remoteRoot: Root = initializeRootMetadata({
      version: 1,
      categories: [
        {
          name: 'Test Category',
          bundles: [
            {
              name: 'Test Bundle',
              bookmarks: [], // No bookmarks - the bookmark was deleted
              metadata: {
                lastModified: '2023-01-02T00:00:00Z', // Modified after lastSynced
                lastSynced: '2023-01-02T00:00:00Z'
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-02T00:00:00Z',
            lastSynced: '2023-01-02T00:00:00Z'
          }
        }
      ]
    });

    // Test merge
    const result = mergeRoots(localRoot, remoteRoot, {
      userLastSynced: '2023-01-01T00:00:00Z'
    });
    
    expect(result.hasConflicts).toBe(false);
    expect(result.mergedRoot.categories).toHaveLength(1);
    expect(result.mergedRoot.categories[0].bundles).toHaveLength(1);
    
    // The bookmark should be deleted from local because remote bundle was modified after lastSynced
    const mergedBookmarks = result.mergedRoot.categories[0].bundles[0].bookmarks;
    expect(mergedBookmarks).toHaveLength(0);
  });

  it('should keep local-only bookmarks when never synced', () => {
    // Local root with metadata indicating never synced (EPOCH timestamp)
    const localRoot: Root = {
      version: 1,
      categories: [
        {
          name: 'Test Category',
          bundles: [
            {
              name: 'Test Bundle',
              bookmarks: [
                {
                  id: 'local-only-bookmark',
                  title: 'Local Only Bookmark',
                  url: 'https://local-only.com',
                  metadata: {
                    lastModified: '2023-01-01T00:00:00Z',
                    lastSynced: '2023-01-01T00:00:00Z'
                  }
                }
              ],
              metadata: {
                lastModified: '2023-01-01T00:00:00Z',
                lastSynced: '2023-01-01T00:00:00Z'
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-01T00:00:00Z',
            lastSynced: '2023-01-01T00:00:00Z'
          }
        }
      ],
      metadata: {
        lastModified: '2023-01-01T00:00:00Z',
        lastSynced: '1970-01-01T00:00:00.000Z' // EPOCH - never synced
      }
    };

    // Remote root without the local bookmark
    const remoteRoot: Root = initializeRootMetadata({
      version: 1,
      categories: [
        {
          name: 'Test Category',
          bundles: [
            {
              name: 'Test Bundle',
              bookmarks: [],
              metadata: {
                lastModified: '2023-01-01T00:00:00Z',
                lastSynced: '2023-01-01T00:00:00Z'
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-01T00:00:00Z',
            lastSynced: '2023-01-01T00:00:00Z'
          }
        }
      ]
    });

    // Test merge
    const result = mergeRoots(localRoot, remoteRoot, {
      userLastSynced: '2023-01-01T00:00:00Z'
    });
    
    expect(result.hasConflicts).toBe(false);
    expect(result.mergedRoot.categories).toHaveLength(1);
    expect(result.mergedRoot.categories[0].bundles).toHaveLength(1);
    
    // The local-only bookmark should be kept because it was never synced
    const mergedBookmarks = result.mergedRoot.categories[0].bundles[0].bookmarks;
    expect(mergedBookmarks).toHaveLength(1);
    expect(mergedBookmarks[0].title).toBe('Local Only Bookmark');
  });
});