import { Result, success, failure } from '../types/result.js';

export interface StorageConfig {
  readonly storageKey: string;
  readonly useSync?: boolean;
}

export interface ChromeStorageShell {
  save: <T>(data: T) => Promise<Result<void>>;
  load: <T>() => Promise<Result<T | null>>;
  remove: () => Promise<Result<void>>;
}

export const createChromeStorageShell = (config: StorageConfig): ChromeStorageShell => {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    throw new Error('Chrome storage API not available');
  }
  const storage = config.useSync ? chrome.storage.sync : chrome.storage.local;

  return {
    save: async <T>(data: T): Promise<Result<void>> => {
      try {
        await storage.set({ [config.storageKey]: data });
        return success(undefined);
      } catch (error) {
        return failure(new Error(`Failed to save to storage: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    load: async <T>(): Promise<Result<T | null>> => {
      try {
        const result = await storage.get([config.storageKey]);
        const data = result[config.storageKey] as T | undefined;
        return success(data || null);
      } catch (error) {
        return failure(new Error(`Failed to load from storage: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    remove: async (): Promise<Result<void>> => {
      try {
        await storage.remove([config.storageKey]);
        return success(undefined);
      } catch (error) {
        return failure(new Error(`Failed to remove from storage: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },
  };
};

export interface LocalStorageShell {
  save: <T>(data: T) => Result<void>;
  load: <T>() => Result<T | null>;
  remove: () => Result<void>;
}

export const createLocalStorageShell = (config: StorageConfig): LocalStorageShell => {
  return {
    save: <T>(data: T): Result<void> => {
      try {
        const serialized = JSON.stringify(data);
        localStorage.setItem(config.storageKey, serialized);
        return success(undefined);
      } catch (error) {
        return failure(new Error(`Failed to save to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    load: <T>(): Result<T | null> => {
      try {
        const serialized = localStorage.getItem(config.storageKey);
        if (serialized === null) {
          return success(null);
        }
        const data = JSON.parse(serialized) as T;
        return success(data);
      } catch (error) {
        return failure(new Error(`Failed to load from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    remove: (): Result<void> => {
      try {
        localStorage.removeItem(config.storageKey);
        return success(undefined);
      } catch (error) {
        return failure(new Error(`Failed to remove from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },
  };
};