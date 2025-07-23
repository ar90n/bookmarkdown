import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../contexts/AppProvider';
import { Button } from '../components/UI/Button';

export const WelcomePage: React.FC = () => {
  const auth = useAuthContext();

  // Different layout based on authentication status
  if (auth.isAuthenticated) {
    // Authenticated users should use the main layout with navigation
    return (
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
                <div className="flex items-center justify-center mb-6">
                  <span className="text-5xl">📚</span>
                </div>
                
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  BookMarkDown
                </h1>
                
                <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                  A simple, powerful bookmark manager that stores your data in GitHub Gists using human-readable Markdown format
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <div className="text-3xl mb-3">📝</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Markdown Format</h3>
                  <p className="text-sm text-gray-600">
                    Human-readable format with no vendor lock-in
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <div className="text-3xl mb-3">🔄</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">GitHub Sync</h3>
                  <p className="text-sm text-gray-600">
                    Auto-sync across devices with your control
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <div className="text-3xl mb-3">🏗️</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Organized</h3>
                  <p className="text-sm text-gray-600">
                    Categories, bundles, tags and notes
                  </p>
                </div>
              </div>

              {/* How It Works - Compact */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">How It Works</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold text-sm">1</span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">Sign In</h3>
                    <p className="text-xs text-gray-600">GitHub OAuth</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold text-sm">2</span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">Add Bookmarks</h3>
                    <p className="text-xs text-gray-600">Organize & Tag</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold text-sm">3</span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">Auto Sync</h3>
                    <p className="text-xs text-gray-600">To GitHub Gist</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold text-sm">4</span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">Access</h3>
                    <p className="text-xs text-gray-600">Anywhere</p>
                  </div>
                </div>
              </div>

              {/* Example Preview - Compact */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">Example Structure</h2>
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                  <div className="text-gray-800">
                    <div className="text-blue-600"># 📚 BookMarkDown</div>
                    <div className="mt-2">
                      <div className="text-green-600">## 🛠️ Development</div>
                      <div className="ml-2 mt-1">
                        <div className="text-purple-600">### Frontend</div>
                        <div className="ml-2 mt-1">
                          <div>- [React Docs](https://react.dev) #react</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
      </div>
    );
  }

  // Layout for non-authenticated users (full screen)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-8">
            <span className="text-6xl">📚</span>
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            BookMarkDown
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A simple, powerful bookmark manager that stores your data in GitHub Gists using human-readable Markdown format
          </p>
          
          <Link to="/login">
            <Button size="lg" className="px-8 py-3">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Markdown Format</h3>
            <p className="text-gray-600">
              Your bookmarks are stored in clean, human-readable Markdown format. No proprietary formats or vendor lock-in.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">GitHub Sync</h3>
            <p className="text-gray-600">
              Automatically sync your bookmarks across all devices using GitHub Gists. Your data stays in your control.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-4">🏗️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Organized Structure</h3>
            <p className="text-gray-600">
              Organize bookmarks with categories and bundles. Add tags and notes for better searchability.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Sign In</h3>
              <p className="text-sm text-gray-600">Connect with your GitHub account</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Add Bookmarks</h3>
              <p className="text-sm text-gray-600">Organize with categories and bundles</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Auto Sync</h3>
              <p className="text-sm text-gray-600">Changes sync automatically to GitHub</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold">4</span>
              </div>
              <h3 className="font-semibold mb-2">Access Anywhere</h3>
              <p className="text-sm text-gray-600">View on any device or directly in GitHub</p>
            </div>
          </div>
        </div>

        {/* Example Preview */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Example Bookmark Structure</h2>
          <div className="bg-gray-50 rounded-lg p-6 font-mono text-sm overflow-x-auto">
            <div className="text-gray-800">
              <div className="text-blue-600"># 📚 BookMarkDown</div>
              <div className="mt-4">
                <div className="text-green-600">## 🛠️ Development</div>
                <div className="ml-4 mt-2">
                  <div className="text-purple-600">### Frontend</div>
                  <div className="ml-4 mt-1">
                    <div>- [React Documentation](https://react.dev) #react #docs</div>
                    <div className="ml-2 text-gray-500 italic">Official React documentation and guides</div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-green-600">## 📖 Learning</div>
                <div className="ml-4 mt-2">
                  <div className="text-purple-600">### Tutorials</div>
                  <div className="ml-4 mt-1">
                    <div>- [MDN Web Docs](https://developer.mozilla.org) #javascript #web</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};