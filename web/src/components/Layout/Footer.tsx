import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 space-y-2 sm:space-y-0">
          <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
            <span className="text-center">© 2024 BookMarkDown Contributors</span>
            <span className="hidden sm:inline">•</span>
            <a 
              href="https://github.com/ar90n/bookmarkdown" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-700 transition-colors"
            >
              Open Source
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};