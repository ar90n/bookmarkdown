import React, { useEffect } from 'react';
import { Button } from '../UI/Button';
import { BaseDialog } from '../UI/BaseDialog';
import { useDialogForm } from '../../hooks/useDialogForm';
import { validateUrl, validateField, trimFields } from '../../utils/validation';
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

interface BookmarkFormData {
  title: string;
  url: string;
  notes: string;
  tags: string;
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
  const isEditMode = !!editingBookmark;

  const getInitialData = (): BookmarkFormData => ({
    title: editingBookmark?.title || '',
    url: editingBookmark?.url || '',
    notes: editingBookmark?.notes || '',
    tags: editingBookmark?.tags ? editingBookmark.tags.join(', ') : ''
  });

  const {
    formData,
    error,
    isSubmitting,
    setFormData,
    setError,
    updateField,
    handleSubmit,
  } = useDialogForm<BookmarkFormData>(isOpen, {
    initialData: getInitialData,
    onValidate: (data) => {
      if (!categoryName || !bundleName) {
        return 'No category or bundle selected';
      }

      const trimmed = trimFields(data);
      
      const urlError = validateUrl(trimmed.url);
      if (urlError) return urlError;

      const titleError = validateField(trimmed.title, { required: true });
      if (titleError) return 'Title is required';

      return null;
    },
  });

  // Update form data when editingBookmark changes
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialData());
    }
  }, [editingBookmark, isOpen]);

  const onSubmitForm = async (data: BookmarkFormData) => {
    if (!categoryName || !bundleName) {
      throw new Error('Category and bundle are required');
    }

    const trimmed = trimFields(data);
    const bookmarkData: BookmarkInput = {
      title: trimmed.title,
      url: trimmed.url,
      notes: trimmed.notes || undefined,
      tags: trimmed.tags
        ? trimmed.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : undefined
    };

    if (isEditMode && onUpdate && editingBookmark) {
      await onUpdate(categoryName, bundleName, editingBookmark.id, bookmarkData);
    } else {
      await onSubmit(categoryName, bundleName, bookmarkData);
    }
    onClose();
  };

  const handleInputChange = (field: keyof BookmarkFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    updateField(field, e.target.value);
  };

  const formId = 'bookmark-dialog-form';
  
  const actions = (
    <>
      <Button
        variant="outline"
        onClick={onClose}
        disabled={isLoading || isSubmitting}
        type="button"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        isLoading={isLoading || isSubmitting}
        disabled={isLoading || isSubmitting || !formData.url.trim() || !formData.title.trim()}
      >
        {isEditMode ? 'Update Bookmark' : 'Add Bookmark'}
      </Button>
    </>
  );

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Bookmark' : 'Add New Bookmark'}
      isLoading={isLoading || isSubmitting}
      error={error}
      actions={actions}
    >
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

      <form id={formId} onSubmit={(e) => handleSubmit(e, onSubmitForm)} className="space-y-4">
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
            disabled={isLoading || isSubmitting}
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
            disabled={isLoading || isSubmitting}
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
            disabled={isLoading || isSubmitting}
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
            disabled={isLoading || isSubmitting}
          />
        </div>
      </form>
    </BaseDialog>
  );
};