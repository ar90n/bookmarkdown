import React from 'react';
import { 
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface SyncConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadRemote: () => void;
  onSaveLocal: () => void;
}

export const SyncConflictDialog: React.FC<SyncConflictDialogProps> = ({
  isOpen,
  onClose,
  onLoadRemote,
  onSaveLocal
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" data-testid="sync-conflict-dialog">
      <div className="bg-white rounded-lg max-w-lg w-full shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Sync Conflict Detected
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Both local and remote have changes. Choose how to resolve:
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Auto-sync is paused while this conflict exists.
              </p>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            {/* Option 1: Keep working locally */}
            <button
              onClick={onClose}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <XMarkIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Continue Editing</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Keep your local changes and resolve the conflict later.
                    You'll need to manually sync to resolve later.
                  </div>
                </div>
              </div>
            </button>

            {/* Option 2: Load from remote */}
            <button
              onClick={onLoadRemote}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <ArrowDownTrayIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Load Remote Version</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="text-red-600 font-medium">Discard your local changes</span> and load the latest version from remote
                  </div>
                </div>
              </div>
            </button>

            {/* Option 3: Force save */}
            <button
              onClick={onSaveLocal}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <ArrowUpTrayIcon className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">Save Your Version</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="text-yellow-600 font-medium">Overwrite remote</span> with your local changes
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Tip:</strong> If you're unsure, choose "Continue Editing" and use the Sync button when ready.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Auto-sync will resume after choosing "Load Remote" or "Save Your Version".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};