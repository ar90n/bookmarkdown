import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../contexts/AppProvider';
import { Button } from '../components/UI/Button';

export const HomePage: React.FC = () => {
  const auth = useAuthContext();

  return (
    <div className="max-w-4xl mx-auto text-center">
      {/* Hero Section */}
      <div className="py-16">
        <div className="flex items-center justify-center mb-6">
          <span className="text-6xl">📚</span>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          BookMarkDown
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          A simple and portable bookmark management service using GitHub Gist as data storage with Markdown format. 
          Human-readable, no vendor lock-in, and built with functional architecture.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {auth.isAuthenticated ? (
            <Link to="/bookmarks">
              <Button size="lg" className="w-full sm:w-auto">
                View My Bookmarks
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
          )}
          <a 
            href="https://github.com/bookmarkdown/bookmarkdown" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View Source
            </Button>
          </a>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-16">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="text-3xl mb-4">📝</div>
          <h3 className="text-lg font-semibold mb-2">Human-Readable</h3>
          <p className="text-gray-600">
            All bookmarks are stored in clean Markdown format. No proprietary formats or vendor lock-in.
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="text-3xl mb-4">🔄</div>
          <h3 className="text-lg font-semibold mb-2">GitHub Sync</h3>
          <p className="text-gray-600">
            Sync your bookmarks across devices using GitHub Gist as secure, versioned storage.
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="text-3xl mb-4">⚛️</div>
          <h3 className="text-lg font-semibold mb-2">Functional Architecture</h3>
          <p className="text-gray-600">
            Built with functional programming principles, immutable data, and comprehensive testing.
          </p>
        </div>
      </div>

      {/* Data Structure Section */}
      <div className="py-16 bg-white rounded-lg border border-gray-200">
        <h2 className="text-3xl font-bold mb-8">Simple Data Structure</h2>
        <div className="max-w-2xl mx-auto text-left">
          <div className="font-mono text-sm bg-gray-50 p-6 rounded-lg border">
            <div className="text-gray-700">
              <div className="mb-2">📂 <span className="font-semibold">Development Tools</span></div>
              <div className="ml-4 mb-2">🧳 <span className="font-semibold">Terminal</span></div>
              <div className="ml-8 mb-1">• <a href="#" className="text-primary-600">iTerm2</a></div>
              <div className="ml-10 text-xs text-gray-500">tags: mac, terminal</div>
              <div className="ml-10 text-xs text-gray-500">notes: Split pane is convenient</div>
              <div className="ml-8 mt-2">• <a href="#" className="text-primary-600">Oh My Zsh</a></div>
              <div className="ml-10 text-xs text-gray-500">tags: zsh, shell, productivity</div>
            </div>
          </div>
          <p className="text-center text-gray-600 mt-4">
            Clean hierarchy: <strong>Categories</strong> → <strong>Bundles</strong> → <strong>Bookmarks</strong>
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16">
        <h2 className="text-3xl font-bold mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold">1</span>
            </div>
            <h4 className="font-semibold mb-2">Sign In</h4>
            <p className="text-gray-600 text-sm">Connect with your GitHub account using a secure token</p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold">2</span>
            </div>
            <h4 className="font-semibold mb-2">Organize</h4>
            <p className="text-gray-600 text-sm">Create categories and bundles to organize your bookmarks</p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold">3</span>
            </div>
            <h4 className="font-semibold mb-2">Add Bookmarks</h4>
            <p className="text-gray-600 text-sm">Save URLs with tags and notes for easy searching</p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold">4</span>
            </div>
            <h4 className="font-semibold mb-2">Sync</h4>
            <p className="text-gray-600 text-sm">Automatically sync across devices via GitHub Gist</p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      {!auth.isAuthenticated && (
        <div className="py-16 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-200">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join developers who value human-readable data and functional architecture. 
            Your bookmarks, your way, with no vendor lock-in.
          </p>
          <Link to="/login">
            <Button size="lg">
              Sign In with GitHub
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};