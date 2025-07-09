import React, { useState } from 'react';
import { MergeConflict, ConflictResolution } from 'bookmarkdown';
import { Button } from '../UI/Button';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: MergeConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolve,
}) => {
  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'remote'>>(() => {
    const initial: Record<string, 'local' | 'remote'> = {};
    conflicts.forEach(conflict => {
      initial[conflict.category] = 'local';
    });
    return initial;
  });

  if (!isOpen) return null;

  const handleResolve = () => {
    const conflictResolutions: ConflictResolution[] = conflicts.map(conflict => ({
      categoryName: conflict.category,
      localLastModified: conflict.localLastModified,
      remoteLastModified: conflict.remoteLastModified,
      resolution: resolutions[conflict.category],
    }));
    onResolve(conflictResolutions);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (dateString === '1970-01-01T00:00:00.000Z') {
      return 'Never synced';
    }
    return date.toLocaleString();
  };

  const handleResolutionChange = (category: string, resolution: 'local' | 'remote') => {
    setResolutions(prev => ({
      ...prev,
      [category]: resolution,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Sync Conflicts Detected</h2>
          <p className="text-gray-600 mt-2">
            Some categories have been modified both locally and remotely. Please choose which version to keep.
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="space-y-6">
            {conflicts.map((conflict) => (
              <div key={conflict.category} className="border rounded-lg p-4">
                <h3 className="font-medium text-lg mb-3">
                  Category: {conflict.category}
                </h3>
                
                <div className="space-y-3">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name={`conflict-${conflict.category}`}
                      value="local"
                      checked={resolutions[conflict.category] === 'local'}
                      onChange={() => handleResolutionChange(conflict.category, 'local')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Keep Local Version</div>
                      <div className="text-sm text-gray-600">
                        Last modified: {formatDate(conflict.localLastModified)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {conflict.localData.bundles.length} bundles, {' '}
                        {conflict.localData.bundles.reduce((sum, b) => sum + b.bookmarks.length, 0)} bookmarks
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name={`conflict-${conflict.category}`}
                      value="remote"
                      checked={resolutions[conflict.category] === 'remote'}
                      onChange={() => handleResolutionChange(conflict.category, 'remote')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Keep Remote Version</div>
                      <div className="text-sm text-gray-600">
                        Last modified: {formatDate(conflict.remoteLastModified)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {conflict.remoteData.bundles.length} bundles, {' '}
                        {conflict.remoteData.bundles.reduce((sum, b) => sum + b.bookmarks.length, 0)} bookmarks
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 border-t flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleResolve}>
            Resolve Conflicts
          </Button>
        </div>
      </div>
    </div>
  );
};