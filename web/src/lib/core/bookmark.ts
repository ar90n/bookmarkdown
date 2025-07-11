import { Bookmark, BookmarkInput, BookmarkUpdate, BookmarkFilter } from '../types/index.js';
import { generateBookmarkId } from '../utils/uuid.js';
import { getCurrentTimestamp } from '../utils/metadata.js';

export const createBookmark = (input: BookmarkInput): Bookmark => {
  const id = generateBookmarkId();
  const bookmark = {
    id,
    title: input.title,
    url: input.url,
    tags: input.tags ? [...input.tags] : undefined,
    notes: input.notes,
    metadata: {
      lastModified: getCurrentTimestamp(),
    },
  };
  
  return bookmark;
};

export const updateBookmark = (bookmark: Bookmark, update: BookmarkUpdate): Bookmark => {
  return {
    ...bookmark,
    ...(('title' in update) && { title: update.title }),
    ...(('url' in update) && { url: update.url }),
    ...(('tags' in update) && { tags: update.tags ? [...update.tags] : undefined }),
    ...(('notes' in update) && { notes: update.notes }),
    metadata: {
      ...bookmark.metadata,
      lastModified: getCurrentTimestamp(),
    },
  };
};

export const bookmarkMatchesFilter = (bookmark: Bookmark, filter: BookmarkFilter): boolean => {
  if (filter.tags && filter.tags.length > 0) {
    if (!bookmark.tags || bookmark.tags.length === 0) {
      return false;
    }
    
    const hasAllTags = filter.tags.every((tag: string) => 
      bookmark.tags!.some((bookmarkTag: string) => 
        bookmarkTag.toLowerCase().includes(tag.toLowerCase())
      )
    );
    
    if (!hasAllTags) {
      return false;
    }
  }

  if (filter.searchTerm) {
    const searchTerm = filter.searchTerm.toLowerCase();
    const titleMatch = bookmark.title.toLowerCase().includes(searchTerm);
    const urlMatch = bookmark.url.toLowerCase().includes(searchTerm);
    const notesMatch = bookmark.notes?.toLowerCase().includes(searchTerm) || false;
    const tagsMatch = bookmark.tags?.some((tag: string) => 
      tag.toLowerCase().includes(searchTerm)
    ) || false;

    if (!titleMatch && !urlMatch && !notesMatch && !tagsMatch) {
      return false;
    }
  }

  return true;
};

export const findBookmarkById = (bookmarks: readonly Bookmark[], id: string): Bookmark | undefined =>
  bookmarks.find(bookmark => bookmark.id === id);

export const removeBookmarkById = (bookmarks: readonly Bookmark[], id: string): readonly Bookmark[] =>
  bookmarks.filter(bookmark => bookmark.id !== id);

export const markBookmarkAsDeleted = (bookmarks: readonly Bookmark[], id: string): readonly Bookmark[] =>
  bookmarks.map(bookmark => 
    bookmark.id === id ? {
      ...bookmark,
      metadata: {
        ...bookmark.metadata,
        lastModified: getCurrentTimestamp(),
        isDeleted: true,
      },
    } : bookmark
  );

export const addBookmark = (bookmarks: readonly Bookmark[], bookmark: Bookmark): readonly Bookmark[] =>
  [...bookmarks, bookmark];

export const updateBookmarkById = (
  bookmarks: readonly Bookmark[], 
  id: string, 
  update: BookmarkUpdate
): readonly Bookmark[] =>
  bookmarks.map(bookmark => 
    bookmark.id === id ? updateBookmark(bookmark, update) : bookmark
  );

export const filterActiveBookmarks = (bookmarks: readonly Bookmark[]): readonly Bookmark[] =>
  bookmarks.filter(bookmark => !bookmark.metadata?.isDeleted);