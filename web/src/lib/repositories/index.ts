export * from './gist-repository.js';
export * from './mock-gist-repository.js';
export * from './fetch-gist-repository.js';

import type { GistRepository } from './gist-repository.js';
import { MockGistRepository } from './mock-gist-repository.js';
import { FetchGistRepository } from './fetch-gist-repository.js';

export interface CreateGistRepositoryConfig {
  mode: 'mock' | 'fetch';
  accessToken?: string;
  filename?: string;
  apiBaseUrl?: string;
}

/**
 * Factory function to create appropriate GistRepository implementation
 */
export function createGistRepository(config: CreateGistRepositoryConfig): GistRepository {
  if (config.mode === 'mock') {
    return new MockGistRepository();
  }
  
  if (!config.accessToken) {
    throw new Error('Access token is required for fetch mode');
  }
  
  return new FetchGistRepository({
    accessToken: config.accessToken,
    filename: config.filename || 'bookmarks.md',
    apiBaseUrl: config.apiBaseUrl
  });
}