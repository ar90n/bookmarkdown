import { GistRepository } from '../repositories/gist-repository.js';

export interface RemoteChangeDetectorConfig {
  repository: GistRepository;
  intervalMs?: number;
  onChangeDetected?: () => void;
  isConflictDialogOpen?: () => boolean;
}

/**
 * Detects remote changes in a Gist repository by polling at regular intervals
 */
export class RemoteChangeDetector {
  private readonly repository: GistRepository;
  private readonly intervalMs: number;
  private readonly onChangeDetected?: () => void;
  private readonly isConflictDialogOpen?: () => boolean;
  private intervalId?: NodeJS.Timeout;
  private running = false;
  
  constructor(config: RemoteChangeDetectorConfig) {
    this.repository = config.repository;
    this.intervalMs = config.intervalMs ?? 10000; // Default: 10 seconds
    this.onChangeDetected = config.onChangeDetected;
    this.isConflictDialogOpen = config.isConflictDialogOpen;
  }
  
  /**
   * Start detecting remote changes
   */
  start(): void {
    if (this.running) {
      return; // Already running
    }
    
    this.running = true;
    
    // Start polling for changes
    this.intervalId = setInterval(() => {
      this.checkForChanges();
    }, this.intervalMs);
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
  
  /**
   * Check for remote changes
   */
  private async checkForChanges(): Promise<void> {
    // Skip check if conflict dialog is open
    if (this.isConflictDialogOpen?.()) {
      return;
    }
    
    try {
      const result = await this.repository.hasRemoteChanges();
      
      if (result.success && result.data && this.onChangeDetected) {
        this.onChangeDetected();
      }
    } catch (error) {
      // Silently ignore errors to keep the detector running
      console.error('Error checking for remote changes:', error);
    }
  }
}