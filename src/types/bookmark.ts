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
}

export interface Root {
  readonly version: 1;
  readonly categories: readonly Category[];
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