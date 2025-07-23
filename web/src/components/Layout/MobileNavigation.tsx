import React, { useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthContext, useDialogContext, useBookmarkContext } from '../../contexts/AppProvider';
import { useChromeExtension } from '../../hooks/useChromeExtension';
import { useToast } from '../../hooks/useToast';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ isOpen, onClose }) => {
  const auth = useAuthContext();
  const dialog = useDialogContext();
  const bookmark = useBookmarkContext();
  const { showSuccess, showError, showInfo } = useToast();
  const chromeExtension = useChromeExtension();

  const navItems = [
    { path: '/welcome', label: 'Welcome', icon: '🏠' },
    ...(auth.isAuthenticated ? [
      { path: '/bookmarks', label: 'Bookmarks', icon: '📚' },
      { path: '/settings', label: 'Settings', icon: '⚙️' },
    ] : [])
  ];

  const handleImportTabs = useCallback(async () => {
    try {
      // Get tabs from current window only
      const tabs = await chromeExtension.getCurrentWindowTabs();
      if (tabs.length === 0) {
        showError('No tabs found in current window');
        return;
      }

      // Show confirmation dialog
      const confirmed = await dialog.openConfirmDialog({
        title: 'Import Current Window Tabs',
        message: `Import ${tabs.length} tab${tabs.length !== 1 ? 's' : ''} from current window to "Browser Tabs" category?`,
        confirmText: 'Import',
        cancelText: 'Cancel',
        confirmButtonClass: 'bg-green-600 hover:bg-green-700'
      });
      
      if (!confirmed) {
        return;
      }

      showInfo('Importing tabs from current window...');

      const categoryName = 'Browser Tabs';
      const bundleName = `Tabs ${new Date().toLocaleString()}`;
      
      await bookmark.addCategory(categoryName);
      await bookmark.addBundle(categoryName, bundleName);
      
      for (const tab of tabs) {
        await bookmark.addBookmark(categoryName, bundleName, {
          title: tab.title,
          url: tab.url,
          tags: ['import', 'tabs'],
          notes: 'Imported from browser tabs'
        });
      }
      
      showSuccess(`Successfully imported ${tabs.length} tabs as "${bundleName}"`);
      onClose(); // Close menu after action
    } catch (error) {
      showError('Failed to import tabs. Please make sure the Chrome extension is active.');
    }
  }, [bookmark, chromeExtension, showSuccess, showError, showInfo, dialog, onClose]);

  const handleQuickAction = useCallback((action: () => void) => {
    action();
    onClose(); // Close menu after action
  }, [onClose]);

  const getLinkClassName = (isActive: boolean) => {
    const baseClasses = "flex items-center space-x-3 px-4 py-3 text-base font-medium transition-colors duration-200";
    const activeClasses = "bg-primary-100 text-primary-700";
    const inactiveClasses = "text-gray-600 hover:bg-gray-100 hover:text-gray-900";
    
    return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-4 overflow-y-auto h-full">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => getLinkClassName(isActive)}
                onClick={onClose}
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
                <button 
                  onClick={() => handleQuickAction(dialog.openCategoryDialog)}
                  className="flex items-center space-x-3 px-4 py-3 w-full text-left text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
                >
                  <span className="text-lg">➕</span>
                  <span>Add Category</span>
                </button>
                <button 
                  onClick={() => handleQuickAction(dialog.openImportDialog)}
                  className="flex items-center space-x-3 px-4 py-3 w-full text-left text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
                >
                  <span className="text-lg">📥</span>
                  <span>Import</span>
                </button>
                <button 
                  onClick={() => handleQuickAction(dialog.openExportDialog)}
                  className="flex items-center space-x-3 px-4 py-3 w-full text-left text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
                >
                  <span className="text-lg">📤</span>
                  <span>Export</span>
                </button>
                {chromeExtension.isAvailable && (
                  <button 
                    onClick={handleImportTabs}
                    className="flex items-center space-x-3 px-4 py-3 w-full text-left text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
                  >
                    <span className="text-lg">📑</span>
                    <span>Import Tabs</span>
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Footer info */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <div>BookMarkDown v1.0.0</div>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};