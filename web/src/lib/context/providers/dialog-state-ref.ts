/**
 * Shared ref to track dialog states across contexts
 * This allows the bookmark context to check if dialogs are open
 * without creating circular dependencies
 */
export const dialogStateRef = {
  isConflictDialogOpen: false,
  hasUnresolvedConflict: false
};

/**
 * Shared ref for dialog callbacks
 * This allows contexts to open dialogs without circular dependencies
 */
export const dialogCallbackRef = {
  openSyncConflictDialog: null as ((options: { 
    onLoadRemote: () => void; 
    onSaveLocal: () => void 
  }) => void) | null
};