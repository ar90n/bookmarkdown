import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createLocalStorageShell,
  createChromeStorageShell,
  type StorageConfig
} from '../../src/lib/shell/storage';

describe('Storage Shells', () => {
  describe('LocalStorageShell', () => {
    const mockConfig: StorageConfig = {
      storageKey: 'test-key'
    };
    
    let localStorageShell: ReturnType<typeof createLocalStorageShell>;
    let mockLocalStorage: Record<string, string>;

    beforeEach(() => {
      // Create a mock localStorage
      mockLocalStorage = {};
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
          setItem: vi.fn((key: string, value: string) => {
            mockLocalStorage[key] = value;
          }),
          removeItem: vi.fn((key: string) => {
            delete mockLocalStorage[key];
          }),
          clear: vi.fn(() => {
            mockLocalStorage = {};
          })
        },
        writable: true
      });
      
      localStorageShell = createLocalStorageShell(mockConfig);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('save', () => {
      it('should save data to localStorage', () => {
        const testData = { name: 'test', value: 123 };
        
        const result = localStorageShell.save(testData);
        
        expect(result.success).toBe(true);
        expect(window.localStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
      });

      it('should handle save errors', () => {
        const error = new Error('Storage quota exceeded');
        vi.mocked(window.localStorage.setItem).mockImplementation(() => {
          throw error;
        });
        
        const result = localStorageShell.save({ data: 'test' });
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Failed to save to localStorage');
          expect(result.error.message).toContain('Storage quota exceeded');
        }
      });

      it('should handle non-Error objects in save', () => {
        vi.mocked(window.localStorage.setItem).mockImplementation(() => {
          throw 'String error';
        });
        
        const result = localStorageShell.save({ data: 'test' });
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Failed to save to localStorage');
          expect(result.error.message).toContain('Unknown error');
        }
      });

      it('should handle circular references', () => {
        const circular: any = { name: 'test' };
        circular.self = circular;
        
        const result = localStorageShell.save(circular);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Failed to save to localStorage');
        }
      });
    });

    describe('load', () => {
      it('should load data from localStorage', () => {
        const testData = { name: 'test', value: 123 };
        vi.mocked(window.localStorage.getItem).mockReturnValue(JSON.stringify(testData));
        
        const result = localStorageShell.load<typeof testData>();
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(testData);
        }
        expect(window.localStorage.getItem).toHaveBeenCalledWith('test-key');
      });

      it('should return null when key does not exist', () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);
        
        const result = localStorageShell.load();
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeNull();
        }
      });

      it('should handle invalid JSON', () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue('invalid json');
        
        const result = localStorageShell.load();
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Failed to load from localStorage');
        }
      });

      it('should handle load errors', () => {
        const error = new Error('Access denied');
        vi.mocked(window.localStorage.getItem).mockImplementation(() => {
          throw error;
        });
        
        const result = localStorageShell.load();
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Failed to load from localStorage');
          expect(result.error.message).toContain('Access denied');
        }
      });
    });

    describe('remove', () => {
      it('should remove data from localStorage', () => {
        const result = localStorageShell.remove();
        
        expect(result.success).toBe(true);
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('test-key');
      });

      it('should handle remove errors', () => {
        const error = new Error('Remove failed');
        vi.mocked(window.localStorage.removeItem).mockImplementation(() => {
          throw error;
        });
        
        const result = localStorageShell.remove();
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Failed to remove from localStorage');
          expect(result.error.message).toContain('Remove failed');
        }
      });
    });
  });

  describe('ChromeStorageShell', () => {
    const mockConfig: StorageConfig = {
      storageKey: 'test-key',
      useSync: false
    };

    let chromeStorageShell: ReturnType<typeof createChromeStorageShell>;
    let mockChromeStorage: any;

    beforeEach(() => {
      // Mock chrome storage API
      mockChromeStorage = {
        local: {
          set: vi.fn().mockImplementation((data, callback) => {
            if (callback) callback();
            return Promise.resolve();
          }),
          get: vi.fn().mockImplementation((keys, callback) => {
            if (callback) callback({});
            return Promise.resolve({});
          }),
          remove: vi.fn().mockImplementation((keys, callback) => {
            if (callback) callback();
            return Promise.resolve();
          })
        },
        sync: {
          set: vi.fn().mockImplementation((data, callback) => {
            if (callback) callback();
            return Promise.resolve();
          }),
          get: vi.fn().mockImplementation((keys, callback) => {
            if (callback) callback({});
            return Promise.resolve({});
          }),
          remove: vi.fn().mockImplementation((keys, callback) => {
            if (callback) callback();
            return Promise.resolve();
          })
        }
      };

      // @ts-ignore - Mock chrome global
      global.chrome = { storage: mockChromeStorage };
    });

    afterEach(() => {
      // @ts-ignore - Clean up chrome global
      delete global.chrome;
      vi.clearAllMocks();
    });

    it('should throw error when chrome storage is not available', () => {
      // @ts-ignore - Remove chrome global
      delete global.chrome;
      
      expect(() => createChromeStorageShell(mockConfig)).toThrow('Chrome storage API not available');
    });

    it('should use local storage by default', () => {
      chromeStorageShell = createChromeStorageShell(mockConfig);
      expect(chromeStorageShell).toBeDefined();
    });

    it('should use sync storage when specified', () => {
      const syncConfig = { ...mockConfig, useSync: true };
      chromeStorageShell = createChromeStorageShell(syncConfig);
      expect(chromeStorageShell).toBeDefined();
    });

    describe('save', () => {
      beforeEach(() => {
        chromeStorageShell = createChromeStorageShell(mockConfig);
      });

      it('should save data to chrome storage', async () => {
        const testData = { name: 'test', value: 123 };
        
        const result = await chromeStorageShell.save(testData);
        
        expect(result.success).toBe(true);
        expect(mockChromeStorage.local.set).toHaveBeenCalledWith({ 'test-key': testData });
      });

      it('should handle save errors', async () => {
        const error = new Error('Storage error');
        mockChromeStorage.local.set.mockRejectedValue(error);
        
        const result = await chromeStorageShell.save({ data: 'test' });
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Failed to save to storage');
          expect(result.error.message).toContain('Storage error');
        }
      });

      it('should use sync storage when configured', async () => {
        const syncConfig = { ...mockConfig, useSync: true };
        const syncShell = createChromeStorageShell(syncConfig);
        const testData = { sync: true };
        
        const result = await syncShell.save(testData);
        
        expect(result.success).toBe(true);
        expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({ 'test-key': testData });
        expect(mockChromeStorage.local.set).not.toHaveBeenCalled();
      });
    });

    describe('load', () => {
      beforeEach(() => {
        chromeStorageShell = createChromeStorageShell(mockConfig);
      });

      it('should load data from chrome storage', async () => {
        const testData = { name: 'test', value: 123 };
        mockChromeStorage.local.get.mockResolvedValue({ 'test-key': testData });
        
        const result = await chromeStorageShell.load();
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(testData);
        }
        expect(mockChromeStorage.local.get).toHaveBeenCalledWith(['test-key']);
      });

      it('should return null when key does not exist', async () => {
        mockChromeStorage.local.get.mockResolvedValue({});
        
        const result = await chromeStorageShell.load();
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeNull();
        }
      });

      it('should handle load errors', async () => {
        const error = new Error('Load error');
        mockChromeStorage.local.get.mockRejectedValue(error);
        
        const result = await chromeStorageShell.load();
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Failed to load from storage');
          expect(result.error.message).toContain('Load error');
        }
      });
    });

    describe('remove', () => {
      beforeEach(() => {
        chromeStorageShell = createChromeStorageShell(mockConfig);
      });

      it('should remove data from chrome storage', async () => {
        const result = await chromeStorageShell.remove();
        
        expect(result.success).toBe(true);
        expect(mockChromeStorage.local.remove).toHaveBeenCalledWith(['test-key']);
      });

      it('should handle remove errors', async () => {
        const error = new Error('Remove error');
        mockChromeStorage.local.remove.mockRejectedValue(error);
        
        const result = await chromeStorageShell.remove();
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Failed to remove from storage');
          expect(result.error.message).toContain('Remove error');
        }
      });
    });

    describe('edge cases', () => {
      it('should handle undefined data correctly', async () => {
        chromeStorageShell = createChromeStorageShell(mockConfig);
        mockChromeStorage.local.get.mockResolvedValue({ 'test-key': undefined });
        
        const result = await chromeStorageShell.load();
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeNull();
        }
      });

      it('should handle non-Error objects in catch blocks', async () => {
        chromeStorageShell = createChromeStorageShell(mockConfig);
        mockChromeStorage.local.set.mockRejectedValue('String error');
        
        const result = await chromeStorageShell.save({ data: 'test' });
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('Failed to save to storage');
          expect(result.error.message).toContain('Unknown error');
        }
      });
    });
  });
});