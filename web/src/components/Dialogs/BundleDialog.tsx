import React, { useEffect } from 'react';
import { Button } from '../UI/Button';
import { BaseDialog } from '../UI/BaseDialog';
import { useDialogForm } from '../../hooks/useDialogForm';
import { validateName, trimFields } from '../../utils/validation';

interface BundleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categoryName: string, bundleName: string) => Promise<void>;
  onRename?: (categoryName: string, oldName: string, newName: string) => Promise<void>;
  categoryName: string | null;
  editingBundleName?: string | null;
  isLoading?: boolean;
}

interface BundleFormData {
  name: string;
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
  const isEditMode = !!editingBundleName;

  const getInitialData = (): BundleFormData => ({
    name: editingBundleName || ''
  });

  const {
    formData,
    error,
    isSubmitting,
    setFormData,
    updateField,
    handleSubmit,
  } = useDialogForm<BundleFormData>(isOpen, {
    initialData: getInitialData,
    onValidate: (data) => {
      if (!categoryName) {
        return 'No category selected';
      }

      const trimmed = trimFields(data);
      return validateName(trimmed.name);
    },
  });

  // Update form data when editingBundleName changes
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialData());
    }
  }, [editingBundleName, isOpen]);

  const onSubmitForm = async (data: BundleFormData) => {
    if (!categoryName) {
      throw new Error('Category is required');
    }

    const trimmed = trimFields(data);
    
    if (isEditMode && onRename && editingBundleName) {
      await onRename(categoryName, editingBundleName, trimmed.name);
    } else {
      await onSubmit(categoryName, trimmed.name);
    }
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateField('name', e.target.value);
  };

  const formId = 'bundle-dialog-form';
  
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
        {isEditMode ? 'Rename Bundle' : 'Create Bundle'}
      </Button>
    </>
  );

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Rename Bundle' : 'Create New Bundle'}
      isLoading={isLoading || isSubmitting}
      error={error}
      actions={actions}
      width="sm"
    >
      {categoryName && (
        <div className="mb-4 text-sm text-gray-600">
          In category: <strong>{categoryName}</strong>
        </div>
      )}

      <form id={formId} onSubmit={(e) => handleSubmit(e, onSubmitForm)}>
        <div>
          <label htmlFor="bundleName" className="block text-sm font-medium text-gray-700 mb-2">
            Bundle Name <span className="text-red-500">*</span>
          </label>
          <input
            id="bundleName"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter bundle name"
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