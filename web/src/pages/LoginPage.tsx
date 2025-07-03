import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AppProvider';
import { Button } from '../components/UI/Button';

export const LoginPage: React.FC = () => {
  const auth = useAuthContext();
  const location = useLocation();

  // Get the intended destination after login
  const from = (location.state as any)?.from?.pathname || '/bookmarks';

  // Redirect if already authenticated
  if (auth.isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleGitHubOAuth = async () => {
    await auth.loginWithOAuth();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-xl">
              <span className="text-2xl">📚</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome to BookMarkDown</h2>
          <p className="mt-2 text-gray-600">
            Sign in with your GitHub account to start managing your bookmarks
          </p>
        </div>

        {/* Error Display */}
        {auth.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-800">{auth.error}</span>
            </div>
          </div>
        )}

        {/* OAuth Login */}
        <div className="space-y-6">
          <Button
            onClick={handleGitHubOAuth}
            isLoading={auth.isLoading}
            className="w-full"
            size="lg"
          >
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign in with GitHub
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Secure OAuth authentication - no tokens to manage manually
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Why BookMarkDown?</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-gray-700">Human-readable Markdown format</p>
                <p className="text-xs text-gray-500">No proprietary file formats or vendor lock-in</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-gray-700">Secure GitHub Gist storage</p>
                <p className="text-xs text-gray-500">Your data stays with you, versioned and backed up</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-gray-700">Functional architecture</p>
                <p className="text-xs text-gray-500">Built with immutable data and comprehensive testing</p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            We only use your GitHub token to access your gists. Your data never leaves your control.
          </p>
        </div>
      </div>
    </div>
  );
};