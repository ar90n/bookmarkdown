import { GistRepository } from '../repositories/gist-repository.js';

export interface RemoteChangeDetectorConfig {
  repository: GistRepository;
  intervalMs?: number;
  onChangeDetected?: () => void;
}

/**
 * Detects remote changes in a Gist repository by polling at regular intervals
 */
export class RemoteChangeDetector {
  private readonly repository: GistRepository;
  private readonly intervalMs: number;
  private readonly onChangeDetected?: () => void;
  private intervalId?: NodeJS.Timeout;
  private running = false;
  
  constructor(config: RemoteChangeDetectorConfig) {
    this.repository = config.repository;
    this.intervalMs = config.intervalMs ?? 30000; // Default: 30 seconds
    this.onChangeDetected = config.onChangeDetected;
  }
  
  /**
   * Start detecting remote changes
   */
  start(): void {
    if (this.running) {
      return; // Already running
    }
    
    this.running = true;
    // TODO: Implement polling logic
  }
  
  /**
   * Stop detecting remote changes
   */
  stop(): void {
    if (!this.running) {
      return; // Already stopped
    }
    
    this.running = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
  
  /**
   * Check if the detector is currently running
   */
  isRunning(): boolean {
    return this.running;
  }
}