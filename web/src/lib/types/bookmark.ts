export interface Bookmark {
  readonly id: string; // For UI optimization only (React key), NOT for business logic
  readonly title: string;
  readonly url: string;
  readonly tags?: readonly string[];
  readonly notes?: string;
  readonly metadata?: {
    readonly lastModified: string; // ISO 8601 timestamp
    readonly lastSynced?: string;   // ISO 8601 timestamp - when this bookmark was last synced
    readonly isDeleted?: boolean;  // For soft deletion tracking
  };
}

export interface Bundle {
  readonly name: string;
  readonly bookmarks: readonly Bookmark[];
  readonly metadata?: {
    readonly lastModified: string; // ISO 8601 timestamp
    readonly lastSynced?: string;   // ISO 8601 timestamp - when this bundle was last synced
    readonly isDeleted?: boolean;   // Soft delete flag
  };
}

export interface Category {
  readonly name: string;
  readonly bundles: readonly Bundle[];
  readonly metadata?: {
    readonly lastModified: string; // ISO 8601 timestamp
    readonly lastSynced?: string;   // ISO 8601 timestamp - when this category was last synced
    readonly isDeleted?: boolean;   // Soft delete flag
  };
}

export interface Root {
  readonly version: 1;
  readonly categories: readonly Category[];
  readonly metadata?: {
    readonly lastModified: string; // ISO 8601 timestamp
    readonly lastSynced?: string;   // ISO 8601 timestamp - when the entire root was last synced (LOCAL ONLY)
  };
}

export interface BookmarkFilter {
  readonly categoryName?: string;
  readonly bundleName?: string;
  readonly tags?: readonly string[];
  readonly searchTerm?: string;
}

export interface BookmarkSearchResult {
  readonly bookmark: Bookmark;
  readonly categoryName: string;
  readonly bundleName: string;
}

export interface BookmarkStats {
  readonly categoriesCount: number;
  readonly bundlesCount: number;
  readonly bookmarksCount: number;
  readonly tagsCount: number;
}

export type BookmarkInput = Omit<Bookmark, 'id'>;
export type BookmarkUpdate = Partial<BookmarkInput>;

export interface ConflictResolution {
  readonly categoryName: string;
  readonly bundleName?: string;
  readonly bookmarkId?: string;
  readonly localLastModified: string;
  readonly remoteLastModified: string;
  readonly resolution: 'local' | 'remote' | 'pending';
  readonly type: 'category' | 'bundle' | 'bookmark';
}

export interface MergeConflict {
  readonly category: string;
  readonly bundle?: string;
  readonly bookmark?: string;
  readonly localData: Category | Bundle | Bookmark;
  readonly remoteData: Category | Bundle | Bookmark;
  readonly localLastModified: string;
  readonly remoteLastModified: string;
  readonly type: 'category' | 'bundle' | 'bookmark';
}

export interface SyncError {
  readonly type: 'deleted' | 'modified' | 'conflict';
  readonly message: string;
  readonly elementType: 'category' | 'bundle' | 'bookmark';
  readonly elementName: string;
  readonly localLastModified?: string;
  readonly remoteLastModified?: string;
}