import { Root, Category } from '../types/index.js';

// Unix epoch timestamp for initial state
export const EPOCH_TIMESTAMP = '1970-01-01T00:00:00.000Z';

// Get current ISO timestamp
export const getCurrentTimestamp = (): string => new Date().toISOString();

// Initialize metadata for Root
export const initializeRootMetadata = (root: Root): Root => ({
  ...root,
  metadata: {
    lastModified: EPOCH_TIMESTAMP,
    lastSync: EPOCH_TIMESTAMP,
  }
});

// Update Root metadata
export const updateRootMetadata = (
  root: Root, 
  lastModified?: string, 
  lastSync?: string
): Root => ({
  ...root,
  metadata: {
    lastModified: lastModified || root.metadata?.lastModified || getCurrentTimestamp(),
    lastSync: lastSync || root.metadata?.lastSync || EPOCH_TIMESTAMP,
  }
});

// Initialize metadata for Category
export const initializeCategoryMetadata = (category: Category): Category => ({
  ...category,
  metadata: {
    lastModified: EPOCH_TIMESTAMP,
  }
});

// Update Category metadata
export const updateCategoryMetadata = (
  category: Category, 
  lastModified?: string
): Category => ({
  ...category,
  metadata: {
    lastModified: lastModified || getCurrentTimestamp(),
  }
});

// Compare timestamps
export const isNewerThan = (timestamp1: string, timestamp2: string): boolean => {
  return new Date(timestamp1) > new Date(timestamp2);
};

// Check if Root has metadata
export const hasRootMetadata = (root: Root): boolean => {
  return !!root.metadata;
};

// Check if Category has metadata
export const hasCategoryMetadata = (category: Category): boolean => {
  return !!category.metadata;
};

// Ensure Root has metadata (create if missing)
export const ensureRootMetadata = (root: Root): Root => {
  if (hasRootMetadata(root)) {
    return root;
  }
  return initializeRootMetadata(root);
};

// Ensure Category has metadata (create if missing)
export const ensureCategoryMetadata = (category: Category): Category => {
  if (hasCategoryMetadata(category)) {
    return category;
  }
  return initializeCategoryMetadata(category);
};

// Get last modified timestamp from Root
export const getRootLastModified = (root: Root): string => {
  return root.metadata?.lastModified || EPOCH_TIMESTAMP;
};

// Get last sync timestamp from Root
export const getRootLastSync = (root: Root): string => {
  return root.metadata?.lastSync || EPOCH_TIMESTAMP;
};

// Get last modified timestamp from Category
export const getCategoryLastModified = (category: Category): string => {
  return category.metadata?.lastModified || EPOCH_TIMESTAMP;
};