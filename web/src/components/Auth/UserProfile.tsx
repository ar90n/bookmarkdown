import React, { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AppProviderV2';
import { Button } from '../UI/Button';

export const UserProfile: React.FC = () => {
  const auth = useAuthContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await auth.logout();
    setIsDropdownOpen(false);
  };

  if (!auth.user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
      >
        <img
          src={auth.user.avatar_url}
          alt={auth.user.login}
          className="w-8 h-8 rounded-full"
        />
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900">
            {auth.user.name || auth.user.login}
          </div>
          <div className="text-xs text-gray-500">
            @{auth.user.login}
          </div>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <img
                src={auth.user.avatar_url}
                alt={auth.user.login}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {auth.user.name || auth.user.login}
                </div>
                <div className="text-xs text-gray-500">
                  @{auth.user.login}
                </div>
                {auth.user.email && (
                  <div className="text-xs text-gray-500">
                    {auth.user.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <a
              href={auth.user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View GitHub Profile
            </a>
            
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>

          {/* Auth info */}
          <div className="px-4 py-2 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              {auth.lastLoginAt && (
                <div>Last login: {auth.lastLoginAt.toLocaleString()}</div>
              )}
              {auth.tokens?.scopes && (
                <div>Scopes: {auth.tokens.scopes.join(', ')}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};