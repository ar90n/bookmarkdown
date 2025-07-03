/*
 * HomePage Tests
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

vi.mock('../../../web/src/contexts/AppProvider', () => ({
  useAuthContext: () => mockAuthContext,
  useAppContext: () => ({
    auth: mockAuthContext,
    bookmark: {},
    initialize: vi.fn(),
  }),
  useBookmarkContext: () => ({}),
}));

import { HomePage } from '../../../web/src/pages/HomePage';

describe('HomePage', () => {
  const renderHomePage = () => {
    return render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );
  };

  it('should render the main heading and description', () => {
    renderHomePage();
    
    expect(screen.getByRole('heading', { name: 'BookMarkDown' })).toBeInTheDocument();
    expect(screen.getByText(/A simple and portable bookmark management service/)).toBeInTheDocument();
  });

  it('should show "Get Started" button when user is not authenticated', () => {
    // mockAuthContext.isAuthenticated is already false by default
    renderHomePage();
    
    expect(screen.getByRole('link', { name: 'Get Started' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View My Bookmarks' })).not.toBeInTheDocument();
  });

  it('should show "View My Bookmarks" button when user is authenticated', () => {
    // Temporarily set authenticated to true
    mockAuthContext.isAuthenticated = true;
    
    renderHomePage();
    
    expect(screen.getByRole('link', { name: 'View My Bookmarks' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Get Started' })).not.toBeInTheDocument();
    
    // Reset for other tests
    mockAuthContext.isAuthenticated = false;
  });

  it('should always show "View Source" button', () => {
    renderHomePage();
    
    const sourceLink = screen.getByRole('link', { name: /View Source/ });
    expect(sourceLink).toBeInTheDocument();
    expect(sourceLink).toHaveAttribute('href', 'https://github.com/bookmarkdown/bookmarkdown');
    expect(sourceLink).toHaveAttribute('target', '_blank');
  });

  it('should display features section', () => {
    renderHomePage();
    
    expect(screen.getByText('Human-Readable')).toBeInTheDocument();
    expect(screen.getByText('GitHub Sync')).toBeInTheDocument();
    expect(screen.getByText('Functional Architecture')).toBeInTheDocument();
    
    // Check feature descriptions
    expect(screen.getByText(/All bookmarks are stored in clean Markdown format/)).toBeInTheDocument();
    expect(screen.getByText(/Sync your bookmarks across devices using GitHub Gist/)).toBeInTheDocument();
    expect(screen.getByText(/Built with functional programming principles/)).toBeInTheDocument();
  });

  it('should display data structure section', () => {
    renderHomePage();
    
    expect(screen.getByRole('heading', { name: 'Simple Data Structure' })).toBeInTheDocument();
    expect(screen.getByText(/Clean hierarchy:/)).toBeInTheDocument();
    expect(screen.getByText('Development Tools')).toBeInTheDocument();
    expect(screen.getByText('Terminal')).toBeInTheDocument();
  });

  it('should display how it works section', () => {
    renderHomePage();
    
    expect(screen.getByRole('heading', { name: 'How It Works' })).toBeInTheDocument();
    
    // Check all 4 steps
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Organize')).toBeInTheDocument();
    expect(screen.getByText('Add Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Sync')).toBeInTheDocument();
    
    // Check step descriptions
    expect(screen.getByText(/Connect with your GitHub account/)).toBeInTheDocument();
    expect(screen.getByText(/Create categories and bundles/)).toBeInTheDocument();
    expect(screen.getByText(/Save URLs with tags and notes/)).toBeInTheDocument();
    expect(screen.getByText(/Automatically sync across devices/)).toBeInTheDocument();
  });

  it('should show call to action section when user is not authenticated', () => {
    renderHomePage();
    
    expect(screen.getByRole('heading', { name: 'Ready to Get Started?' })).toBeInTheDocument();
    expect(screen.getByText(/Join developers who value human-readable data/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In with GitHub' })).toBeInTheDocument();
  });

  it('should hide call to action section when user is authenticated', () => {
    mockAuthContext.isAuthenticated = true;
    renderHomePage();
    
    expect(screen.queryByRole('heading', { name: 'Ready to Get Started?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign In with GitHub' })).not.toBeInTheDocument();
    
    mockAuthContext.isAuthenticated = false; // Reset
  });

  it('should have correct navigation links', () => {
    renderHomePage();
    
    const getStartedLink = screen.getByRole('link', { name: 'Get Started' });
    expect(getStartedLink.closest('a')).toHaveAttribute('href', '/login');
    
    const signInLink = screen.getByRole('link', { name: 'Sign In with GitHub' });
    expect(signInLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('should have correct navigation link for authenticated users', () => {
    mockAuthContext.isAuthenticated = true;
    renderHomePage();
    
    const bookmarksLink = screen.getByRole('link', { name: 'View My Bookmarks' });
    expect(bookmarksLink.closest('a')).toHaveAttribute('href', '/bookmarks');
    
    mockAuthContext.isAuthenticated = false; // Reset
  });

  it('should display the emoji icons', () => {
    renderHomePage();
    
    // Main hero icon
    expect(screen.getByText('📚')).toBeInTheDocument();
    
    // Feature icons
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('🔄')).toBeInTheDocument();
    expect(screen.getByText('⚛️')).toBeInTheDocument();
    
    // Data structure icons
    expect(screen.getByText('📂')).toBeInTheDocument();
    expect(screen.getByText('🧳')).toBeInTheDocument();
  });

  it('should have proper accessibility structure', () => {
    renderHomePage();
    
    // Check heading hierarchy
    const mainHeading = screen.getByRole('heading', { name: 'BookMarkDown' });
    expect(mainHeading.tagName).toBe('H1');
    
    const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
    expect(sectionHeadings).toHaveLength(3); // Simple Data Structure, How It Works, Ready to Get Started
    
    // Check that buttons are properly labeled
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });
    
    // Check that links have proper attributes
    const externalLink = screen.getByRole('link', { name: /View Source/ });
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});