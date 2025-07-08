import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  onRename?: (oldName: string, newName: string) => Promise<void>;
  editingCategoryName?: string | null;
  isLoading?: boolean;
}

export const CategoryDialog: React.FC<CategoryDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onRename,
  editingCategoryName,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editingCategoryName;

  // Initialize form data when editing
  useEffect(() => {
    if (editingCategoryName) {
      setName(editingCategoryName);
    } else {
      setName('');
    }
    setError(null);
  }, [editingCategoryName, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Category name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Category name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Category name must be less than 50 characters');
      return;
    }

    try {
      setError(null);
      if (isEditMode && onRename && editingCategoryName) {
        await onRename(editingCategoryName, trimmedName);
      } else {
        await onSubmit(trimmedName);
      }
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'rename' : 'create'} category`);
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
              {isEditMode ? 'Edit Category' : 'Add New Category'}
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

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-2">
                Category Name
              </label>
              <input
                id="categoryName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter category name"
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
                disabled={isLoading || !name.trim()}
              >
                {isEditMode ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};