import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { BookmarkInput, Bookmark } from 'bookmarkdown';

interface BookmarkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categoryName: string, bundleName: string, bookmark: BookmarkInput) => Promise<void>;
  onUpdate?: (categoryName: string, bundleName: string, bookmarkId: string, bookmark: BookmarkInput) => Promise<void>;
  categoryName: string | null;
  bundleName: string | null;
  editingBookmark?: Bookmark | null;
  isLoading?: boolean;
}

export const BookmarkDialog: React.FC<BookmarkDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  categoryName,
  bundleName,
  editingBookmark,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    notes: '',
    tags: ''
  });
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editingBookmark;

  // Initialize form data when editing
  useEffect(() => {
    if (editingBookmark) {
      setFormData({
        title: editingBookmark.title,
        url: editingBookmark.url,
        notes: editingBookmark.notes || '',
        tags: editingBookmark.tags ? editingBookmark.tags.join(', ') : ''
      });
    } else {
      setFormData({
        title: '',
        url: '',
        notes: '',
        tags: ''
      });
    }
    setError(null);
  }, [editingBookmark, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryName || !bundleName) {
      setError('No category or bundle selected');
      return;
    }
    
    const trimmedUrl = formData.url.trim();
    const trimmedTitle = formData.title.trim();
    
    if (!trimmedUrl) {
      setError('URL is required');
      return;
    }

    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    const bookmarkData: BookmarkInput = {
      title: trimmedTitle,
      url: trimmedUrl,
      notes: formData.notes.trim() || undefined,
      tags: formData.tags.trim() 
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : undefined
    };

    try {
      setError(null);
      if (isEditMode && onUpdate && editingBookmark) {
        await onUpdate(categoryName, bundleName, editingBookmark.id, bookmarkData);
      } else {
        await onSubmit(categoryName, bundleName, bookmarkData);
      }
      setFormData({ title: '', url: '', notes: '', tags: '' });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} bookmark`);
    }
  };

  const handleClose = () => {
    setFormData({ title: '', url: '', notes: '', tags: '' });
    setError(null);
    onClose();
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditMode ? 'Edit Bookmark' : 'Add New Bookmark'}
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

          {categoryName && bundleName && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-lg mr-2">📂</span>
                <span>{categoryName}</span>
                <span className="mx-2">→</span>
                <span className="text-lg mr-2">🧳</span>
                <span><strong>{bundleName}</strong></span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="bookmarkUrl" className="block text-sm font-medium text-gray-700 mb-2">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                id="bookmarkUrl"
                type="url"
                value={formData.url}
                onChange={handleInputChange('url')}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="bookmarkTitle" className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="bookmarkTitle"
                type="text"
                value={formData.title}
                onChange={handleInputChange('title')}
                placeholder="Enter bookmark title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="bookmarkTags" className="block text-sm font-medium text-gray-700 mb-2">
                Tags <span className="text-gray-400">(comma-separated)</span>
              </label>
              <input
                id="bookmarkTags"
                type="text"
                value={formData.tags}
                onChange={handleInputChange('tags')}
                placeholder="programming, web, tutorial"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="bookmarkNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="bookmarkNotes"
                value={formData.notes}
                onChange={handleInputChange('notes')}
                placeholder="Additional notes about this bookmark..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end space-x-3 pt-4">
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
                disabled={isLoading || !formData.url.trim() || !formData.title.trim()}
              >
                {isEditMode ? 'Update Bookmark' : 'Add Bookmark'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};