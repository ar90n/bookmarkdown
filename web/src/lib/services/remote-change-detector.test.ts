import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RemoteChangeDetector } from './remote-change-detector';
import { GistRepository } from '../repositories/gist-repository';

// Mock GistRepository
const mockRepository: GistRepository = {
  create: vi.fn(),
  read: vi.fn(),
  update: vi.fn(),
  exists: vi.fn(),
  findByFilename: vi.fn(),
  hasRemoteChanges: vi.fn(),
};

describe('RemoteChangeDetector - Conflict Dialog Check', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should skip checking when conflict dialog is open', async () => {
    const onChangeDetected = vi.fn();
    const isConflictDialogOpen = vi.fn();
    
    // Setup: dialog is open
    isConflictDialogOpen.mockReturnValue(true);
    
    const detector = new RemoteChangeDetector({
      repository: mockRepository,
      intervalMs: 1000,
      onChangeDetected,
      isConflictDialogOpen
    });
    
    detector.start();
    
    // Advance timer to trigger check
    await vi.advanceTimersByTimeAsync(1000);
    
    // Should not check repository when dialog is open
    expect(mockRepository.hasRemoteChanges).not.toHaveBeenCalled();
    expect(isConflictDialogOpen).toHaveBeenCalled();
    
    detector.stop();
  });
  
  it('should check normally when conflict dialog is not open', async () => {
    const onChangeDetected = vi.fn();
    const isConflictDialogOpen = vi.fn();
    
    // Setup: dialog is not open
    isConflictDialogOpen.mockReturnValue(false);
    
    // Repository has changes
    (mockRepository.hasRemoteChanges as any).mockResolvedValue({
      success: true,
      data: true
    });
    
    const detector = new RemoteChangeDetector({
      repository: mockRepository,
      intervalMs: 1000,
      onChangeDetected,
      isConflictDialogOpen
    });
    
    detector.start();
    
    // Advance timer to trigger check
    await vi.advanceTimersByTimeAsync(1000);
    
    // Should check repository when dialog is not open
    expect(mockRepository.hasRemoteChanges).toHaveBeenCalled();
    expect(onChangeDetected).toHaveBeenCalled();
    
    detector.stop();
  });
  
  it('should work without isConflictDialogOpen callback', async () => {
    const onChangeDetected = vi.fn();
    
    // Repository has changes
    (mockRepository.hasRemoteChanges as any).mockResolvedValue({
      success: true,
      data: true
    });
    
    const detector = new RemoteChangeDetector({
      repository: mockRepository,
      intervalMs: 1000,
      onChangeDetected
      // No isConflictDialogOpen callback
    });
    
    detector.start();
    
    // Advance timer to trigger check
    await vi.advanceTimersByTimeAsync(1000);
    
    // Should check repository normally
    expect(mockRepository.hasRemoteChanges).toHaveBeenCalled();
    expect(onChangeDetected).toHaveBeenCalled();
    
    detector.stop();
  });
  
  it('should resume checking after dialog closes', async () => {
    const onChangeDetected = vi.fn();
    const isConflictDialogOpen = vi.fn();
    
    // Repository has changes
    (mockRepository.hasRemoteChanges as any).mockResolvedValue({
      success: true,
      data: true
    });
    
    const detector = new RemoteChangeDetector({
      repository: mockRepository,
      intervalMs: 1000,
      onChangeDetected,
      isConflictDialogOpen
    });
    
    detector.start();
    
    // First check: dialog is open
    isConflictDialogOpen.mockReturnValue(true);
    await vi.advanceTimersByTimeAsync(1000);
    
    expect(mockRepository.hasRemoteChanges).not.toHaveBeenCalled();
    
    // Second check: dialog is closed
    isConflictDialogOpen.mockReturnValue(false);
    await vi.advanceTimersByTimeAsync(1000);
    
    expect(mockRepository.hasRemoteChanges).toHaveBeenCalled();
    expect(onChangeDetected).toHaveBeenCalled();
    
    detector.stop();
  });
});