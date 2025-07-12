import React, { useEffect } from 'react';
import { Button } from '../UI/Button';
import { BaseDialog } from '../UI/BaseDialog';
import { useDialogForm } from '../../hooks/useDialogForm';
import { validateName, trimFields } from '../../utils/validation';

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  onRename?: (oldName: string, newName: string) => Promise<void>;
  editingCategoryName?: string | null;
  isLoading?: boolean;
}

interface CategoryFormData {
  name: string;
}

export const CategoryDialog: React.FC<CategoryDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onRename,
  editingCategoryName,
  isLoading = false,
}) => {
  const isEditMode = !!editingCategoryName;

  const getInitialData = (): CategoryFormData => ({
    name: editingCategoryName || ''
  });

  const {
    formData,
    error,
    isSubmitting,
    setFormData,
    updateField,
    handleSubmit,
  } = useDialogForm<CategoryFormData>(isOpen, {
    initialData: getInitialData,
    onValidate: (data) => {
      const trimmed = trimFields(data);
      return validateName(trimmed.name);
    },
  });

  // Update form data when editingCategoryName changes
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialData());
    }
  }, [editingCategoryName, isOpen]);

  const onSubmitForm = async (data: CategoryFormData) => {
    const trimmed = trimFields(data);
    
    if (isEditMode && onRename && editingCategoryName) {
      await onRename(editingCategoryName, trimmed.name);
    } else {
      await onSubmit(trimmed.name);
    }
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateField('name', e.target.value);
  };

  const formId = 'category-dialog-form';
  
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
        disabled={isLoading || isSubmitting || !formData.name.trim()}
      >
        {isEditMode ? 'Rename Category' : 'Create Category'}
      </Button>
    </>
  );

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Rename Category' : 'Create New Category'}
      isLoading={isLoading || isSubmitting}
      error={error}
      actions={actions}
      width="sm"
    >
      <form id={formId} onSubmit={(e) => handleSubmit(e, onSubmitForm)}>
        <div>
          <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-2">
            Category Name <span className="text-red-500">*</span>
          </label>
          <input
            id="categoryName"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter category name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={isLoading || isSubmitting}
            autoFocus
            maxLength={50}
          />
          <p className="mt-1 text-xs text-gray-500">
            2-50 characters
          </p>
        </div>
      </form>
    </BaseDialog>
  );
};