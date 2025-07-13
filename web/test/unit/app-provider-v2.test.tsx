import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider } from '../../src/contexts/AppProviderV2';
import React from 'react';

// Mock modules
vi.mock('../../src/lib/context/providers/useAuthContextProvider', () => ({
  useAuthContextProvider: () => ({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    user: null,
    tokens: null,
    login: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    setError: vi.fn(),
    clearError: vi.fn()
  })
}));

// Mock BroadcastChannel
global.BroadcastChannel = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onmessage: null,
  onmessageerror: null,
})) as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};
global.localStorage = localStorageMock as any;

describe('AppProviderV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should render children after initialization', async () => {
    const TestComponent = () => {
      return <div>Test Content</div>;
    };
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );
    
    // Should show loading state initially
    expect(screen.getByText('Initializing BookMarkDown...')).toBeInTheDocument();
    
    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });
  
  it('should provide app context to children', async () => {
    const TestComponent = () => {
      const { useAppContext } = require('../../src/contexts/AppProviderV2');
      const context = useAppContext();
      
      return (
        <div>
          <div>Has Auth: {context.auth ? 'yes' : 'no'}</div>
          <div>Has Bookmark: {context.bookmark ? 'yes' : 'no'}</div>
          <div>Has Config: {context.config ? 'yes' : 'no'}</div>
        </div>
      );
    };
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Has Auth: yes')).toBeInTheDocument();
      expect(screen.getByText('Has Bookmark: yes')).toBeInTheDocument();
      expect(screen.getByText('Has Config: yes')).toBeInTheDocument();
    });
  });
  
  it('should use custom config', async () => {
    const customConfig = {
      autoSync: false,
      syncInterval: 10,
      oauthServiceUrl: 'https://custom.example.com'
    };
    
    const TestComponent = () => {
      const { useAppContext } = require('../../src/contexts/AppProviderV2');
      const { config } = useAppContext();
      
      return (
        <div>
          <div>AutoSync: {config.autoSync ? 'on' : 'off'}</div>
          <div>Interval: {config.syncInterval}</div>
          <div>OAuth URL: {config.oauthServiceUrl}</div>
        </div>
      );
    };
    
    render(
      <AppProvider config={customConfig}>
        <TestComponent />
      </AppProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('AutoSync: off')).toBeInTheDocument();
      expect(screen.getByText('Interval: 10')).toBeInTheDocument();
      expect(screen.getByText('OAuth URL: https://custom.example.com')).toBeInTheDocument();
    });
  });
});