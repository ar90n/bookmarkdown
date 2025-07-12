import { Metadata } from 'bookmarkdown';
import { getCurrentTimestamp } from '../lib/utils/metadata';

/**
 * Generic entity with metadata
 */
export interface EntityWithMetadata {
  metadata: Metadata;
}

/**
 * Generic entity with ID
 */
export interface EntityWithId {
  id: string;
}

/**
 * Update options for entity operations
 */
export interface UpdateOptions {
  skipMetadataUpdate?: boolean;
  preserveCreatedAt?: boolean;
}

/**
 * Update an entity with automatic metadata timestamp update
 */
export function updateWithMetadata<T extends EntityWithMetadata>(
  entity: T,
  updates: Partial<Omit<T, 'metadata'>>,
  options: UpdateOptions = {}
): T {
  const { skipMetadataUpdate = false } = options;

  return {
    ...entity,
    ...updates,
    metadata: skipMetadataUpdate
      ? entity.metadata
      : {
          ...entity.metadata,
          lastModified: getCurrentTimestamp(),
        },
  };
}

/**
 * Soft delete an entity by marking it as deleted
 */
export function softDelete<T extends EntityWithMetadata>(
  entity: T
): T {
  return {
    ...entity,
    metadata: {
      ...entity.metadata,
      lastModified: getCurrentTimestamp(),
      isDeleted: true,
    },
  };
}

/**
 * Restore a soft-deleted entity
 */
export function restore<T extends EntityWithMetadata>(
  entity: T
): T {
  return {
    ...entity,
    metadata: {
      ...entity.metadata,
      lastModified: getCurrentTimestamp(),
      isDeleted: false,
    },
  };
}

/**
 * Update an item in an array by ID
 */
export function updateArrayItemById<T extends EntityWithId>(
  array: readonly T[],
  id: string,
  updater: (item: T) => T
): T[] {
  return array.map(item => 
    item.id === id ? updater(item) : item
  );
}

/**
 * Update an item in an array by a custom predicate
 */
export function updateArrayItem<T>(
  array: readonly T[],
  predicate: (item: T) => boolean,
  updater: (item: T) => T
): T[] {
  return array.map(item => 
    predicate(item) ? updater(item) : item
  );
}

/**
 * Remove an item from an array by ID
 */
export function removeArrayItemById<T extends EntityWithId>(
  array: readonly T[],
  id: string
): T[] {
  return array.filter(item => item.id !== id);
}

/**
 * Remove an item from an array by predicate
 */
export function removeArrayItem<T>(
  array: readonly T[],
  predicate: (item: T) => boolean
): T[] {
  return array.filter(item => !predicate(item));
}

/**
 * Add an item to an array with optional deduplication
 */
export function addToArray<T>(
  array: readonly T[],
  item: T,
  options: {
    deduplicate?: (existing: T, newItem: T) => boolean;
    position?: 'start' | 'end';
  } = {}
): T[] {
  const { deduplicate, position = 'end' } = options;

  if (deduplicate) {
    const exists = array.some(existing => deduplicate(existing, item));
    if (exists) {
      return [...array];
    }
  }

  return position === 'start' 
    ? [item, ...array]
    : [...array, item];
}

/**
 * Move an item within an array
 */
export function moveArrayItem<T>(
  array: readonly T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (fromIndex === toIndex) {
    return [...array];
  }

  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  
  return result;
}

/**
 * Find and update a nested entity
 */
export function updateNested<T extends EntityWithMetadata, K extends keyof T>(
  entity: T,
  nestedKey: K,
  predicate: (item: any) => boolean,
  updater: (item: any) => any
): T {
  const nestedArray = entity[nestedKey] as any[];
  
  if (!Array.isArray(nestedArray)) {
    throw new Error(`Property ${String(nestedKey)} is not an array`);
  }

  const updatedArray = nestedArray.map(item =>
    predicate(item) ? updater(item) : item
  );

  return updateWithMetadata(entity, {
    [nestedKey]: updatedArray,
  } as Partial<T>);
}

/**
 * Batch update multiple entities
 */
export function batchUpdate<T extends EntityWithMetadata & EntityWithId>(
  entities: readonly T[],
  updates: Array<{ id: string; changes: Partial<Omit<T, 'metadata' | 'id'>> }>
): T[] {
  const updateMap = new Map(
    updates.map(({ id, changes }) => [id, changes])
  );

  return entities.map(entity => {
    const changes = updateMap.get(entity.id);
    return changes 
      ? updateWithMetadata(entity, changes)
      : entity;
  });
}

/**
 * Create a new entity with metadata
 */
export function createEntity<T extends EntityWithMetadata>(
  data: Omit<T, 'metadata'>,
  metadata?: Partial<Metadata>
): T {
  const now = getCurrentTimestamp();
  
  return {
    ...data,
    metadata: {
      createdAt: now,
      lastModified: now,
      version: 1,
      isDeleted: false,
      ...metadata,
    },
  } as T;
}

/**
 * Check if an entity exists in an array
 */
export function entityExists<T extends EntityWithId>(
  array: readonly T[],
  id: string
): boolean {
  return array.some(item => item.id === id);
}

/**
 * Find an entity by ID
 */
export function findEntityById<T extends EntityWithId>(
  array: readonly T[],
  id: string
): T | undefined {
  return array.find(item => item.id === id);
}

/**
 * Sort entities by metadata field
 */
export function sortByMetadata<T extends EntityWithMetadata>(
  entities: readonly T[],
  field: keyof Metadata = 'lastModified',
  order: 'asc' | 'desc' = 'desc'
): T[] {
  return [...entities].sort((a, b) => {
    const aValue = a.metadata[field];
    const bValue = b.metadata[field];
    
    if (aValue === bValue) return 0;
    
    const comparison = aValue > bValue ? 1 : -1;
    return order === 'asc' ? comparison : -comparison;
  });
}

/**
 * Filter out soft-deleted entities
 */
export function filterActive<T extends EntityWithMetadata>(
  entities: readonly T[]
): T[] {
  return entities.filter(entity => !entity.metadata.isDeleted);
}

/**
 * Get only soft-deleted entities
 */
export function filterDeleted<T extends EntityWithMetadata>(
  entities: readonly T[]
): T[] {
  return entities.filter(entity => entity.metadata.isDeleted);
}