import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test-utils';
import { BookmarksPage } from '../../src/pages/BookmarksPage';
import { AppProvider } from '../../src/contexts/AppProvider';

// Mock the contexts
vi.mock('../../src/contexts/AppProvider', () => ({
  useBookmarkContext: vi.fn(),
  useDialogContext: vi.fn(() => ({
    openCategoryDialog: vi.fn(),
    openBookmarkDialog: vi.fn(),
    openBundleDialog: vi.fn(),
    openCategoryEditDialog: vi.fn(),
    openBundleEditDialog: vi.fn(),
    openBookmarkEditDialog: vi.fn(),
    openConfirmDialog: vi.fn(),
  })),
  AppProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../src/hooks/useChromeExtension', () => ({
  useChromeExtension: () => ({ isAvailable: false, getAllTabs: vi.fn() }),
}));

vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    removeToast: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

vi.mock('../../src/hooks/useMobile', () => ({
  useMobile: () => false,
}));

vi.mock('../../src/components/dnd', () => ({
  DnDProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DraggableBookmark: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DraggableBundle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DroppableBundle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DroppableCategory: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('BookmarksPage - Loading State', () => {
  it('should show loading spinner when initial sync is not completed and is syncing', async () => {
    const { useBookmarkContext } = await import('../../src/contexts/AppProvider');
    
    (useBookmarkContext as any).mockReturnValue({
      initialSyncCompleted: false,
      isSyncing: true,
      root: { categories: [] },
      getStats: () => ({ categoriesCount: 0, bundlesCount: 0, bookmarksCount: 0, tagsCount: 0 }),
    });

    render(<BookmarksPage />);

    expect(screen.getByText('Syncing with Gist...')).toBeInTheDocument();
    // Check for spinner element
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show normal content when initial sync is completed', async () => {
    const { useBookmarkContext } = await import('../../src/contexts/AppProvider');
    
    (useBookmarkContext as any).mockReturnValue({
      initialSyncCompleted: true,
      isSyncing: false,
      root: { categories: [] },
      getStats: () => ({ categoriesCount: 0, bundlesCount: 0, bookmarksCount: 0, tagsCount: 0 }),
    });

    render(<BookmarksPage />);

    expect(screen.getByText('My Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('No bookmarks yet')).toBeInTheDocument();
  });

  it('should show normal content when not syncing even if initial sync not completed', async () => {
    const { useBookmarkContext } = await import('../../src/contexts/AppProvider');
    
    (useBookmarkContext as any).mockReturnValue({
      initialSyncCompleted: false,
      isSyncing: false,
      root: { categories: [] },
      getStats: () => ({ categoriesCount: 0, bundlesCount: 0, bookmarksCount: 0, tagsCount: 0 }),
    });

    render(<BookmarksPage />);

    expect(screen.getByText('My Bookmarks')).toBeInTheDocument();
    expect(screen.queryByText('Syncing with Gist...')).not.toBeInTheDocument();
  });
});