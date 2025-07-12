import { useState, useEffect, useCallback } from 'react';

export interface DialogFormState<T> {
  data: T;
  error: string | null;
  isSubmitting: boolean;
}

export interface UseDialogFormOptions<T> {
  initialData: T | (() => T);
  onValidate?: (data: T) => string | null;
  resetOnClose?: boolean;
}

export function useDialogForm<T>(
  isOpen: boolean,
  options: UseDialogFormOptions<T>
) {
  const { initialData, onValidate, resetOnClose = true } = options;
  
  const getInitialData = () => {
    return typeof initialData === 'function' ? initialData() : initialData;
  };

  const [state, setState] = useState<DialogFormState<T>>({
    data: getInitialData(),
    error: null,
    isSubmitting: false,
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen && resetOnClose) {
      setState({
        data: getInitialData(),
        error: null,
        isSubmitting: false,
      });
    }
  }, [isOpen, resetOnClose]);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data, error: null }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setState(prev => ({ ...prev, isSubmitting }));
  }, []);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value },
      error: null,
    }));
  }, []);

  const validate = useCallback(() => {
    if (onValidate) {
      const error = onValidate(state.data);
      if (error) {
        setError(error);
        return false;
      }
    }
    return true;
  }, [state.data, onValidate, setError]);

  const handleSubmit = useCallback(async (
    e: React.FormEvent,
    onSubmit: (data: T) => Promise<void>
  ) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(state.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  }, [state.data, validate, setSubmitting, setError]);

  return {
    formData: state.data,
    error: state.error,
    isSubmitting: state.isSubmitting,
    setFormData: setData,
    setError,
    updateField,
    handleSubmit,
    validate,
  };
}