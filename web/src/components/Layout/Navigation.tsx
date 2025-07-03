import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AppProvider';

export const Navigation: React.FC = () => {
  const auth = useAuthContext();

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    ...(auth.isAuthenticated ? [
      { path: '/bookmarks', label: 'Bookmarks', icon: '📚' },
      { path: '/settings', label: 'Settings', icon: '⚙️' },
    ] : [])
  ];

  const getLinkClassName = (isActive: boolean) => {
    const baseClasses = "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200";
    const activeClasses = "bg-primary-100 text-primary-700 border-r-2 border-primary-600";
    const inactiveClasses = "text-gray-600 hover:bg-gray-100 hover:text-gray-900";
    
    return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
  };

  return (
    <nav className="w-64 bg-white shadow-sm border-r border-gray-200 p-4">
      <div className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => getLinkClassName(isActive)}
            end={item.path === '/'}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Quick actions */}
      {auth.isAuthenticated && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="space-y-1">
            <button className="flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200">
              <span className="text-lg">➕</span>
              <span>Add Category</span>
            </button>
            <button className="flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200">
              <span className="text-lg">📥</span>
              <span>Import</span>
            </button>
            <button className="flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200">
              <span className="text-lg">📤</span>
              <span>Export</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Footer info */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>BookMarkDown v1.0.0</div>
          <div>Functional architecture</div>
          <div>Open source</div>
        </div>
      </div>
    </nav>
  );
};