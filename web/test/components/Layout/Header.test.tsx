import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from '../../../src/components/Layout/Header';

// Mock the contexts
const mockAuthContext = {
  isAuthenticated: true,
  error: null,
  clearError: vi.fn(),
};

const mockBookmarkContext = {
  isDirty: false,
  error: null,
  clearError: vi.fn(),
  getStats: vi.fn(() => ({
    categoriesCount: 5,
    bundlesCount: 12,
    bookmarksCount: 45,
    tagsCount: 23,
  })),
};

vi.mock('../../../src/contexts/AppProvider', () => ({
  useAuthContext: () => mockAuthContext,
  useBookmarkContext: () => mockBookmarkContext,
}));

// Mock child components
vi.mock('../../../src/components/ui/SyncStatusWithActions', () => ({
  SyncStatusWithActions: () => <div>SyncStatus</div>,
}));

vi.mock('../../../src/components/Auth/UserProfile', () => ({
  UserProfile: () => <div>UserProfile</div>,
}));

const renderHeader = () => {
  return render(
    <BrowserRouter>
      <Header />
    </BrowserRouter>
  );
};

describe('Header', () => {
  it('should render the application title', () => {
    renderHeader();
    
    expect(screen.getByText('BookMarkDown')).toBeInTheDocument();
    expect(screen.getByText('Portable bookmark management')).toBeInTheDocument();
  });

  describe('Statistics Display', () => {
    it('should display categories count when authenticated', () => {
      renderHeader();
      
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
    });

    it('should display bundles count when authenticated', () => {
      renderHeader();
      
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Bundles')).toBeInTheDocument();
    });

    it('should display bookmarks count when authenticated', () => {
      renderHeader();
      
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('Bookmarks')).toBeInTheDocument();
    });

    it('should display tags count when authenticated', () => {
      renderHeader();
      
      expect(screen.getByText('23')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('should not display statistics when not authenticated', () => {
      mockAuthContext.isAuthenticated = false;
      
      renderHeader();
      
      expect(screen.queryByText('Categories')).not.toBeInTheDocument();
      expect(screen.queryByText('Bundles')).not.toBeInTheDocument();
      expect(screen.queryByText('Bookmarks')).not.toBeInTheDocument();
      expect(screen.queryByText('Tags')).not.toBeInTheDocument();
      
      // Reset
      mockAuthContext.isAuthenticated = true;
    });
  });

  describe('User Actions', () => {
    it('should show sync status and user profile when authenticated', () => {
      renderHeader();
      
      expect(screen.getByText('SyncStatus')).toBeInTheDocument();
      expect(screen.getByText('UserProfile')).toBeInTheDocument();
    });

    it('should show sign in button when not authenticated', () => {
      mockAuthContext.isAuthenticated = false;
      
      renderHeader();
      
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.queryByText('UserProfile')).not.toBeInTheDocument();
      
      // Reset
      mockAuthContext.isAuthenticated = true;
    });

    it('should show unsaved changes indicator when isDirty', () => {
      mockBookmarkContext.isDirty = true;
      
      renderHeader();
      
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      
      // Reset
      mockBookmarkContext.isDirty = false;
    });
  });

  describe('Error Banner', () => {
    it('should display auth error when present', () => {
      mockAuthContext.error = 'Authentication failed';
      
      renderHeader();
      
      expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      
      // Reset
      mockAuthContext.error = null;
    });

    it('should display bookmark error when present', () => {
      mockBookmarkContext.error = 'Sync failed';
      
      renderHeader();
      
      expect(screen.getByText('Sync failed')).toBeInTheDocument();
      
      // Reset
      mockBookmarkContext.error = null;
    });
  });
});