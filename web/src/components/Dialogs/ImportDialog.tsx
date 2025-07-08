import React, { useState } from 'react';
import { Button } from '../UI/Button';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: string, format: 'json' | 'markdown') => Promise<void>;
  isLoading: boolean;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  isLoading
}) => {
  const [importData, setImportData] = useState('');
  const [format, setFormat] = useState<'json' | 'markdown'>('json');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importData.trim()) return;

    try {
      await onImport(importData, format);
      setImportData('');
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportData(content);
      
      // Auto-detect format based on file extension
      if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        setFormat('markdown');
      } else {
        setFormat('json');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Import Bookmarks</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import Format
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value as 'json')}
                  className="mr-2"
                />
                JSON (BookMarkDown format)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="markdown"
                  checked={format === 'markdown'}
                  onChange={(e) => setFormat(e.target.value as 'markdown')}
                  className="mr-2"
                />
                Markdown
              </label>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File
            </label>
            <input
              type="file"
              accept=".json,.md,.markdown,.txt"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>

          {/* Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Paste Content
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={format === 'json' 
                ? 'Paste JSON data here...' 
                : 'Paste Markdown content here...'
              }
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!importData.trim()}
            >
              Import
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};