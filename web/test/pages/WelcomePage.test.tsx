/*
 * WelcomePage Tests
 * Tests for the landing page component
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the AppProvider hooks before importing HomePage
const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  tokens: null,
  lastLoginAt: null,
  login: vi.fn(),
  logout: vi.fn(),
  refreshAuth: vi.fn(),
  loginWithOAuth: vi.fn(),
};

vi.mock('../../src/contexts/AppProvider', () => ({
  useAuthContext: () => mockAuthContext,
  useAppContext: () => ({
    auth: mockAuthContext,
    bookmark: {
      getStats: vi.fn(() => ({ totalBookmarks: 0, totalCategories: 0, totalBundles: 0 }))
    },
    initialize: vi.fn(),
  }),
  useBookmarkContext: () => ({
    getStats: vi.fn(() => ({ totalBookmarks: 0, totalCategories: 0, totalBundles: 0 })),
    isAutoSyncEnabled: () => true,
    loadFromRemote: vi.fn(),
    saveToRemote: vi.fn()
  }),
  useDialogContext: () => ({
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    isOpen: false,
    currentDialog: null,
  }),
}));

import { WelcomePage } from '../../src/pages/WelcomePage';

describe('WelcomePage', () => {
  const renderWelcomePage = () => {
    return render(
      <BrowserRouter>
        <WelcomePage />
      </BrowserRouter>
    );
  };

  it('should render the main heading and description', () => {
    renderWelcomePage();
    
    expect(screen.getByRole('heading', { name: 'BookMarkDown' })).toBeInTheDocument();
    expect(screen.getByText(/A simple, powerful bookmark manager that stores your data in GitHub Gists using human-readable Markdown format/)).toBeInTheDocument();
  });

  it('should show "Get Started" button when user is not authenticated', () => {
    // mockAuthContext.isAuthenticated is already false by default
    renderWelcomePage();
    
    expect(screen.getByRole('link', { name: 'Get Started' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View My Bookmarks' })).not.toBeInTheDocument();
  });

  it('should show authenticated content when user is authenticated', () => {
    // Temporarily set authenticated to true
    mockAuthContext.isAuthenticated = true;
    
    renderWelcomePage();
    
    // When authenticated, user sees the compact welcome content without Get Started button
    expect(screen.queryByRole('link', { name: 'Get Started' })).not.toBeInTheDocument();
    // The page still shows the main content but in a more compact form
    expect(screen.getByRole('heading', { name: 'BookMarkDown' })).toBeInTheDocument();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    
    // Reset for other tests
    mockAuthContext.isAuthenticated = false;
  });

  // Removed test for View Source button as it no longer exists in the WelcomePage

  it('should display features section', () => {
    renderWelcomePage();
    
    expect(screen.getByText('Markdown Format')).toBeInTheDocument();
    expect(screen.getByText('GitHub Sync')).toBeInTheDocument();
    expect(screen.getByText('Organized Structure')).toBeInTheDocument();
    
    // Check feature descriptions
    expect(screen.getByText(/Your bookmarks are stored in clean, human-readable Markdown format/)).toBeInTheDocument();
    expect(screen.getByText(/Automatically sync your bookmarks across all devices using GitHub Gists/)).toBeInTheDocument();
    expect(screen.getByText(/Organize bookmarks with categories and bundles/)).toBeInTheDocument();
  });

  it('should display data structure section', () => {
    renderWelcomePage();
    
    expect(screen.getByRole('heading', { name: 'Example Bookmark Structure' })).toBeInTheDocument();
    // The structure content is now shown as code snippets
    expect(screen.getByText(/Development/)).toBeInTheDocument();
    expect(screen.getByText(/Frontend/)).toBeInTheDocument();
  });

  it('should display how it works section', () => {
    renderWelcomePage();
    
    expect(screen.getByRole('heading', { name: 'How It Works' })).toBeInTheDocument();
    
    // Check all 4 steps
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Add Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Auto Sync')).toBeInTheDocument();
    expect(screen.getByText('Access Anywhere')).toBeInTheDocument();
    
    // Check step descriptions
    expect(screen.getByText('Connect with your GitHub account')).toBeInTheDocument();
    expect(screen.getByText('Organize with categories and bundles')).toBeInTheDocument();
    expect(screen.getByText('Changes sync automatically to GitHub')).toBeInTheDocument();
    expect(screen.getByText('View on any device or directly in GitHub')).toBeInTheDocument();
  });

  // Removed tests for call to action section as it no longer exists in the WelcomePage

  it('should have correct navigation links', () => {
    renderWelcomePage();
    
    const getStartedLink = screen.getByRole('link', { name: 'Get Started' });
    expect(getStartedLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('should not show Get Started link for authenticated users', () => {
    mockAuthContext.isAuthenticated = true;
    renderWelcomePage();
    
    // Authenticated users don't see the Get Started link
    expect(screen.queryByRole('link', { name: 'Get Started' })).not.toBeInTheDocument();
    
    mockAuthContext.isAuthenticated = false; // Reset
  });

  it('should display the emoji icons', () => {
    renderWelcomePage();
    
    // Main hero icon
    expect(screen.getByText('📚')).toBeInTheDocument();
    
    // Feature icons
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('🔄')).toBeInTheDocument();
    expect(screen.getByText('🏗️')).toBeInTheDocument();
  });

  it('should have proper accessibility structure', () => {
    renderWelcomePage();
    
    // Check heading hierarchy
    const mainHeading = screen.getByRole('heading', { name: 'BookMarkDown' });
    expect(mainHeading.tagName).toBe('H1');
    
    const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
    expect(sectionHeadings).toHaveLength(2); // How It Works, Example Bookmark Structure
    
    // Check that interactive elements are properly labeled
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveAccessibleName();
    });
  });
});