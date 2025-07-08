import React, { useState } from 'react';
import { Button } from '../UI/Button';

interface CreateGistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (isPublic: boolean) => void;
  isLoading?: boolean;
}

export const CreateGistDialog: React.FC<CreateGistDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}) => {
  const [isPublic, setIsPublic] = useState(false); // Default to private

  const handleCreate = () => {
    onCreate(isPublic);
  };

  const handleClose = () => {
    setIsPublic(false); // Reset to default
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Create New Gist</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Your bookmarks will be stored in a new GitHub Gist.
            </p>

            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="mr-3 text-primary-600 focus:ring-primary-500"
                  disabled={isLoading}
                />
                <div>
                  <div className="font-medium text-gray-900">Private</div>
                  <div className="text-sm text-gray-500">Only you can see this gist</div>
                </div>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="mr-3 text-primary-600 focus:ring-primary-500"
                  disabled={isLoading}
                />
                <div>
                  <div className="font-medium text-gray-900">Public</div>
                  <div className="text-sm text-gray-500">Anyone can see this gist</div>
                </div>
              </label>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This cannot be changed after creation.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              isLoading={isLoading}
              disabled={isLoading}
            >
              Create Gist
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};