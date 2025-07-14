import { useState, useEffect } from 'react';

export interface TabInfo {
  title: string;
  url: string;
  id: number;
  windowId: number;
}

export interface ChromeExtensionHook {
  isAvailable: boolean;
  isLoading: boolean;
  getAllTabs: () => Promise<TabInfo[]>;
  getCurrentWindowTabs: () => Promise<TabInfo[]>;
  getTabCount: () => Promise<number>;
}

export const useChromeExtension = (): ChromeExtensionHook => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkExtension = async () => {
      try {
        // Method 1: Check DOM attributes (most reliable)
        const extensionId = document.documentElement.getAttribute('data-bookmarkdown-extension-id');
        const available = document.documentElement.getAttribute('data-bookmarkdown-available') === 'true';
        
        if (extensionId && available) {
          setIsAvailable(true);
          setIsLoading(false);
          return;
        }
        
        // Method 2: Check if extension injected availability flag
        const extensionFlag = (window as any).bookmarkdownExtensionAvailable;
        const windowExtensionId = (window as any).bookmarkdownExtensionId;
        
        if (extensionFlag && windowExtensionId) {
          setIsAvailable(true);
          setIsLoading(false);
          return;
        }

        // Method 3: Try external connection (if chrome.runtime is available)
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          try {
            const response = await chrome.runtime.sendMessage(extensionId, {
              action: 'getTabStatus'
            });
            setIsAvailable(true);
            setIsLoading(false);
            return;
          } catch (connectError) {
            // Connection failed, continue to next method
          }
        }

        // Method 4: Direct Chrome API check (fallback)
        if (typeof chrome === 'undefined' || !chrome.storage) {
          setIsAvailable(false);
          setIsLoading(false);
          return;
        }

        // Try to access chrome.storage to confirm extension is active
        const result = await chrome.storage.local.get(['currentTabInfo']);
        const allTabsResult = await chrome.storage.local.get(['allTabsInfo']);
        
        setIsAvailable(true);
      } catch (error) {
        console.error('Chrome extension check failed:', error);
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Listen for PostMessage from extension
    const handlePostMessage = (event: MessageEvent) => {
      if (event.data.type === 'BOOKMARKDOWN_EXTENSION_READY' && 
          event.data.source === 'bookmarkdown-content-script') {
        if (event.data.available && event.data.extensionId) {
          setIsAvailable(true);
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('message', handlePostMessage);

    // MutationObserver to watch for DOM attribute changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'data-bookmarkdown-extension-id' || 
             mutation.attributeName === 'data-bookmarkdown-available')) {
          const extensionId = document.documentElement.getAttribute('data-bookmarkdown-extension-id');
          const available = document.documentElement.getAttribute('data-bookmarkdown-available') === 'true';
          
          if (extensionId && available) {
            setIsAvailable(true);
            setIsLoading(false);
          }
        }
      });
    });

    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['data-bookmarkdown-extension-id', 'data-bookmarkdown-available'] 
    });
    
    // Wait a bit for content script to load
    setTimeout(checkExtension, 500);
    
    // Cleanup
    return () => {
      window.removeEventListener('message', handlePostMessage);
      observer.disconnect();
    };
  }, []);

  const getAllTabs = async (): Promise<TabInfo[]> => {
    if (!isAvailable) {
      throw new Error('Chrome extension is not available');
    }

    try {
      // Method 1: Try content script communication via PostMessage
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Content script timeout'));
        }, 5000);

        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'BOOKMARKDOWN_TABS_RESPONSE') {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            resolve(event.data.tabs || []);
          } else if (event.data.type === 'BOOKMARKDOWN_TABS_ERROR') {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', messageHandler);
        window.postMessage({ type: 'BOOKMARKDOWN_GET_TABS' }, '*');
      });

      // Method 2: Try external connection
      const extensionId = document.documentElement.getAttribute('data-bookmarkdown-extension-id') || 
                          (window as any).bookmarkdownExtensionId;
      if (extensionId && typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          const response = await chrome.runtime.sendMessage(extensionId, {
            action: 'getAllTabs'
          });
          return response.allTabsInfo || [];
        } catch (connectError) {
          // Connection failed, continue to next method
        }
      }

      // Method 3: Direct chrome.storage access (fallback)
      const result = await chrome.storage.local.get(['allTabsInfo']);
      return result.allTabsInfo || [];
    } catch (error) {
      console.error('Error getting all tabs:', error);
      return [];
    }
  };

  const getCurrentWindowTabs = async (): Promise<TabInfo[]> => {
    if (!isAvailable) {
      throw new Error('Chrome extension is not available');
    }

    try {
      // Method 1: Try content script communication via PostMessage
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Content script timeout'));
        }, 5000);

        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'BOOKMARKDOWN_CURRENT_WINDOW_TABS_RESPONSE') {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            resolve(event.data.tabs || []);
          } else if (event.data.type === 'BOOKMARKDOWN_CURRENT_WINDOW_TABS_ERROR') {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', messageHandler);
        window.postMessage({ type: 'BOOKMARKDOWN_GET_CURRENT_WINDOW_TABS' }, '*');
      });

      // Method 2: Try external connection
      const extensionId = document.documentElement.getAttribute('data-bookmarkdown-extension-id') || 
                          (window as any).bookmarkdownExtensionId;
      if (extensionId && typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          const response = await chrome.runtime.sendMessage(extensionId, {
            action: 'getCurrentWindowTabs'
          });
          return response.currentWindowTabsInfo || [];
        } catch (connectError) {
          // Connection failed, continue to next method
        }
      }

      // Method 3: Direct chrome.storage access (fallback)
      const result = await chrome.storage.local.get(['currentWindowTabsInfo']);
      return result.currentWindowTabsInfo || [];
    } catch (error) {
      console.error('Error getting current window tabs:', error);
      return [];
    }
  };

  const getTabCount = async (): Promise<number> => {
    try {
      const tabs = await getAllTabs();
      return tabs.length;
    } catch (error) {
      return 0;
    }
  };

  return {
    isAvailable,
    isLoading,
    getAllTabs,
    getCurrentWindowTabs,
    getTabCount
  };
};