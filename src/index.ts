/*
 * Copyright 2024 BookMarkDown Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createBookmarkService } from './adapters/index.js';
import { createSyncShell } from './shell/index.js';

console.log('BookMarkDown - Starting application...');

// Factory function for creating bookmark service with sync capability
export const createBookmarkApp = (config?: {
  accessToken?: string;
  gistId?: string;
  filename?: string;
  description?: string;
}) => {
  if (config?.accessToken) {
    const syncShell = createSyncShell({
      accessToken: config.accessToken,
      filename: config.filename || 'bookmarks.md',
      gistId: config.gistId,
      description: config.description,
    });
    return createBookmarkService(syncShell);
  }
  
  return createBookmarkService();
};

// Default instance for backward compatibility
export const bookmarkService = createBookmarkService();

// Export all functional components
export * from './core/index.js';
export * from './shell/index.js';
export * from './adapters/index.js';
export * from './types/index.js';
export * from './parsers/index.js';
export * from './utils/index.js';
export * from './context/index.js';

// Re-export schemas with different names to avoid conflicts
export { 
  BookmarkSchema as ZodBookmarkSchema,
  BundleSchema as ZodBundleSchema, 
  CategorySchema as ZodCategorySchema,
  RootSchema as ZodRootSchema 
} from './schemas/index.js';