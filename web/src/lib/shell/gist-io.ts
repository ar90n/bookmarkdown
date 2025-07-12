import { Result } from '../types/result.js';

export interface GistConfig {
  readonly accessToken: string;
  readonly filename: string;
  readonly isPublic?: boolean;
}

export interface GistContent {
  readonly id: string;
  readonly content: string;
  readonly updatedAt: string;
  readonly createdAt: string;
}

export interface GistCreateResult {
  readonly id: string;
  readonly updatedAt: string;
}

export interface GistReadResult {
  readonly id: string;
  readonly content: string;
  readonly updatedAt: string;
}

export interface GistClient {
  create: (description: string, content: string) => Promise<Result<GistCreateResult>>;
  read: (gistId: string) => Promise<Result<GistReadResult>>;
  update: (gistId: string, content: string, description?: string) => Promise<Result<GistCreateResult>>;
  exists: (gistId: string) => Promise<Result<boolean>>;
  findByFilename: (filename: string) => Promise<Result<GistReadResult | null>>;
}

// Import the fetch-based implementation
import { createGistClient as createFetchGistClient } from './gist-io-fetch.js';

// Export the fetch-based implementation
export const createGistClient = createFetchGistClient;