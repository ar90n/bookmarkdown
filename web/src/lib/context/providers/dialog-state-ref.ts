/**
 * Shared ref to track dialog states across contexts
 * This allows the bookmark context to check if dialogs are open
 * without creating circular dependencies
 */
export const dialogStateRef = {
  isConflictDialogOpen: false
};