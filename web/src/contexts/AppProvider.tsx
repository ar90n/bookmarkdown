import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppContextValue, AppConfig, useAppContextProvider } from '../lib';
import { DialogProvider } from './DialogContext';

// Create React context for the BookMarkDown app context
const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Convenience hooks for specific contexts
export const useBookmarkContext = () => {
  const { bookmark } = useAppContext();
  return bookmark;
};

export const useAuthContext = () => {
  const { auth } = useAppContext();
  return auth;
};

// Re-export dialog context hook
export { useDialogContext } from './DialogContext';

interface AppProviderProps {
  children: React.ReactNode;
  config?: AppConfig;
}

export const AppProvider: React.FC<AppProviderProps> = ({ 
  children, 
  config = {} 
}) => {
  const defaultConfig: AppConfig = {
    autoSync: true,
    syncInterval: 5, // 5 minutes
    storageConfig: {
      bookmarkKey: 'bookmarkdown_data',
      authKey: 'bookmarkdown_auth'
    },
    scopes: ['gist', 'user:email'],
    oauthServiceUrl: import.meta.env.VITE_OAUTH_SERVICE_URL || 'http://localhost:8787',
    ...config
  };
  
  // Use the V2 hook-based context
  const appContext = useAppContextProvider(defaultConfig);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await appContext.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Continue anyway to allow user to see the app
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [appContext]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing BookMarkDown...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={appContext}>
      <DialogProvider>
        {children}
      </DialogProvider>
    </AppContext.Provider>
  );
};