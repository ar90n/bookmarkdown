import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';

interface BundleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categoryName: string, bundleName: string) => Promise<void>;
  onRename?: (categoryName: string, oldName: string, newName: string) => Promise<void>;
  categoryName: string | null;
  editingBundleName?: string | null;
  isLoading?: boolean;
}

export const BundleDialog: React.FC<BundleDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onRename,
  categoryName,
  editingBundleName,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editingBundleName;

  // Initialize form data when editing
  useEffect(() => {
    if (editingBundleName) {
      setName(editingBundleName);
    } else {
      setName('');
    }
    setError(null);
  }, [editingBundleName, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryName) {
      setError('No category selected');
      return;
    }
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Bundle name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Bundle name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Bundle name must be less than 50 characters');
      return;
    }

    try {
      setError(null);
      if (isEditMode && onRename && editingBundleName) {
        await onRename(categoryName, editingBundleName, trimmedName);
      } else {
        await onSubmit(categoryName, trimmedName);
      }
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'rename' : 'create'} bundle`);
    }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditMode ? 'Edit Bundle' : 'Add New Bundle'}
            </h2>
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

          {categoryName && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-lg mr-2">📂</span>
                <span>Adding bundle to: <strong>{categoryName}</strong></span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="bundleName" className="block text-sm font-medium text-gray-700 mb-2">
                Bundle Name
              </label>
              <input
                id="bundleName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter bundle name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isLoading}
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                type="button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading || !name.trim() || !categoryName}
              >
                {isEditMode ? 'Save Changes' : 'Create Bundle'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};