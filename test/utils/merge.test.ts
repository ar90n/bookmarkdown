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

    // Test merge - use EPOCH for userLastSynced since local was never synced
    const result = mergeRoots(localRoot, remoteRoot, {
      userLastSynced: '1970-01-01T00:00:00.000Z'
    });
    
    expect(result.hasConflicts).toBe(false);
    expect(result.mergedRoot.categories).toHaveLength(1);
    expect(result.mergedRoot.categories[0].bundles).toHaveLength(1);
    
    // The local-only bookmark should be kept because it was never synced
    const mergedBookmarks = result.mergedRoot.categories[0].bundles[0].bookmarks;
    expect(mergedBookmarks).toHaveLength(1);
    expect(mergedBookmarks[0].title).toBe('Local Only Bookmark');
  });

  it('should handle move operations without creating duplicates', () => {
    // Simulate a bookmark that was moved between bundles on remote
    const localRoot: Root = initializeRootMetadata({
      version: 1,
      categories: [
        {
          name: 'Test Category',
          bundles: [
            {
              name: 'Source Bundle',
              bookmarks: [
                {
                  id: 'moved-bookmark',
                  title: 'Moved Bookmark',
                  url: 'https://moved.com',
                  metadata: {
                    lastModified: '2023-01-01T00:00:00Z'
                  }
                }
              ],
              metadata: {
                lastModified: '2023-01-01T00:00:00Z'
              }
            },
            {
              name: 'Target Bundle',
              bookmarks: [],
              metadata: {
                lastModified: '2023-01-01T00:00:00Z'
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-01T00:00:00Z'
          }
        }
      ]
    });

    // Remote has the bookmark moved to Target Bundle
    const remoteRoot: Root = initializeRootMetadata({
      version: 1,
      categories: [
        {
          name: 'Test Category',
          bundles: [
            {
              name: 'Source Bundle',
              bookmarks: [], // Bookmark moved away
              metadata: {
                lastModified: '2023-01-02T00:00:00Z' // Updated after move
              }
            },
            {
              name: 'Target Bundle',
              bookmarks: [
                {
                  id: 'moved-bookmark-new-id', // Different ID after move
                  title: 'Moved Bookmark',
                  url: 'https://moved.com',
                  metadata: {
                    lastModified: '2023-01-02T00:00:00Z'
                  }
                }
              ],
              metadata: {
                lastModified: '2023-01-02T00:00:00Z' // Updated after move
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-02T00:00:00Z'
          }
        }
      ]
    });

    const result = mergeRoots(localRoot, remoteRoot, {
      userLastSynced: '2023-01-01T00:00:00Z'
    });

    expect(result.hasConflicts).toBe(false);
    
    const sourceBundle = result.mergedRoot.categories[0].bundles[0];
    const targetBundle = result.mergedRoot.categories[0].bundles[1];
    
    // Source bundle should be empty (bookmark moved away and detected as deleted)
    expect(sourceBundle.bookmarks).toHaveLength(0);
    
    // Target bundle should have the bookmark (moved from remote)
    expect(targetBundle.bookmarks).toHaveLength(1);
    expect(targetBundle.bookmarks[0].title).toBe('Moved Bookmark');
    
    // Total should be 1, not 2 (no duplication)
    const totalBookmarks = sourceBundle.bookmarks.length + targetBundle.bookmarks.length;
    expect(totalBookmarks).toBe(1);
  });

  it('should detect conflicting modifications and prefer newer timestamp', () => {
    // Both local and remote modified the same bookmark
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
                  id: 'conflict-bookmark',
                  title: 'Local Modified Title',
                  url: 'https://conflict.com',
                  notes: 'Local notes',
                  metadata: {
                    lastModified: '2023-01-01T00:00:00Z' // Older
                  }
                }
              ],
              metadata: {
                lastModified: '2023-01-01T00:00:00Z'
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-01T00:00:00Z'
          }
        }
      ]
    });

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
                  id: 'conflict-bookmark-remote',
                  title: 'Remote Modified Title',
                  url: 'https://conflict.com',
                  notes: 'Remote notes',
                  metadata: {
                    lastModified: '2023-01-02T00:00:00Z' // Newer
                  }
                }
              ],
              metadata: {
                lastModified: '2023-01-02T00:00:00Z'
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-02T00:00:00Z'
          }
        }
      ]
    });

    const result = mergeRoots(localRoot, remoteRoot, {
      userLastSynced: '2023-01-01T00:00:00Z'
    });

    expect(result.hasConflicts).toBe(false);
    
    const mergedBookmarks = result.mergedRoot.categories[0].bundles[0].bookmarks;
    expect(mergedBookmarks).toHaveLength(1);
    
    // Should prefer remote version (newer timestamp)
    expect(mergedBookmarks[0].title).toBe('Remote Modified Title');
    expect(mergedBookmarks[0].notes).toBe('Remote notes');
  });
});