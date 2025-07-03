import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>© 2024 BookMarkDown</span>
            <span>•</span>
            <a 
              href="https://github.com/bookmarkdown/bookmarkdown" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-700 transition-colors"
            >
              Open Source
            </a>
            <span>•</span>
            <span>Functional DDD Architecture</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span>Made with</span>
            <span className="text-red-500">♥</span>
            <span>and</span>
            <span className="font-mono text-primary-600">TypeScript</span>
          </div>
        </div>
      </div>
    </footer>
  );
};