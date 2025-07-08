import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'json' | 'markdown') => Promise<string>;
  isLoading: boolean;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  isLoading
}) => {
  const [format, setFormat] = useState<'json' | 'markdown'>('json');
  const [exportedData, setExportedData] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const data = await onExport(format);
      setExportedData(data);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportedData], { 
      type: format === 'json' ? 'application/json' : 'text/markdown' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks.${format === 'json' ? 'json' : 'md'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportedData);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  useEffect(() => {
    if (isOpen && !exportedData) {
      handleExport();
    }
  }, [isOpen, format]);

  useEffect(() => {
    if (isOpen) {
      setExportedData('');
      handleExport();
    }
  }, [format]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Export Bookmarks</h2>
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

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
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

          {/* Export Content */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Exported Content
              </label>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopy}
                  disabled={!exportedData || isGenerating}
                >
                  📋 Copy
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownload}
                  disabled={!exportedData || isGenerating}
                >
                  📥 Download
                </Button>
              </div>
            </div>
            
            {isGenerating ? (
              <div className="w-full h-96 bg-gray-50 rounded-md flex items-center justify-center">
                <div className="text-gray-500">Generating export...</div>
              </div>
            ) : (
              <textarea
                value={exportedData}
                readOnly
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm resize-none"
                placeholder="Export will appear here..."
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};