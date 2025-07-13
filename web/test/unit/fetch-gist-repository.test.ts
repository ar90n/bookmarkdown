import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FetchGistRepository } from '../../src/lib/repositories/fetch-gist-repository.js';
import type { GistRepository } from '../../src/lib/repositories/gist-repository.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('FetchGistRepository', () => {
  let repository: GistRepository;
  const mockAccessToken = 'test-token';
  const mockFilename = 'bookmarks.md';
  
  beforeEach(() => {
    vi.clearAllMocks();
    repository = new FetchGistRepository({
      accessToken: mockAccessToken,
      filename: mockFilename
    });
  });
  
  describe('constructor', () => {
    it('should create instance with required config', () => {
      expect(repository).toBeDefined();
      expect(repository.create).toBeDefined();
      expect(repository.read).toBeDefined();
      expect(repository.update).toBeDefined();
      expect(repository.exists).toBeDefined();
      expect(repository.findByFilename).toBeDefined();
      expect(repository.getCommits).toBeDefined();
    });
    
    it('should validate access token', () => {
      expect(() => {
        new FetchGistRepository({
          accessToken: '',
          filename: 'test.md'
        });
      }).toThrow('Access token is required');
    });
    
    it('should validate filename', () => {
      expect(() => {
        new FetchGistRepository({
          accessToken: 'token',
          filename: ''
        });
      }).toThrow('Filename is required');
    });
    
    it('should use default API base URL', () => {
      const repo = new FetchGistRepository({
        accessToken: 'token',
        filename: 'test.md'
      });
      expect(repo).toBeDefined();
    });
    
    it('should accept custom API base URL', () => {
      const repo = new FetchGistRepository({
        accessToken: 'token',
        filename: 'test.md',
        apiBaseUrl: 'https://custom.github.com/api/v3'
      });
      expect(repo).toBeDefined();
    });
  });
});