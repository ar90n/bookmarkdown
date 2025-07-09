export interface Bookmark {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly tags?: readonly string[];
  readonly notes?: string;
}

export interface Bundle {
  readonly name: string;
  readonly bookmarks: readonly Bookmark[];
}

export interface Category {
  readonly name: string;
  readonly bundles: readonly Bundle[];
  readonly metadata?: {
    readonly lastModified: string; // ISO 8601 timestamp
  };
}

export interface Root {
  readonly version: 1;
  readonly categories: readonly Category[];
  readonly metadata?: {
    readonly lastModified: string; // ISO 8601 timestamp
    readonly lastSync: string;     // ISO 8601 timestamp
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
  readonly localLastModified: string;
  readonly remoteLastModified: string;
  readonly resolution: 'local' | 'remote' | 'pending';
}

export interface MergeConflict {
  readonly category: string;
  readonly localData: Category;
  readonly remoteData: Category;
  readonly localLastModified: string;
  readonly remoteLastModified: string;
}