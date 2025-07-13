import React, { useState } from 'react';
import { useBookmarkContext } from '../../contexts/AppProviderV2';

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'bookmark' | 'bundle';
  currentCategory: string;
  currentBundle?: string;
  itemId: string;
  itemName: string;
  onMove: (targetCategory: string, targetBundle?: string) => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({
  isOpen,
  onClose,
  itemType,
  currentCategory,
  currentBundle,
  itemId,
  itemName,
  onMove
}) => {
  const bookmark = useBookmarkContext();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBundle, setSelectedBundle] = useState('');

  if (!isOpen) return null;

  const categories = bookmark.root.categories;
  const selectedCategoryData = categories.find(c => c.name === selectedCategory);

  const handleMove = () => {
    if (!selectedCategory) return;
    
    if (itemType === 'bookmark' && !selectedBundle) return;
    
    onMove(selectedCategory, selectedBundle || undefined);
    onClose();
  };

  const isCurrentLocation = () => {
    if (itemType === 'bundle') {
      return selectedCategory === currentCategory;
    }
    return selectedCategory === currentCategory && selectedBundle === currentBundle;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Move {itemType}: {itemName}
          </h3>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Category
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => {
                    setSelectedCategory(category.name);
                    setSelectedBundle('');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                    selectedCategory === category.name ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  📂 {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Bundle Selection (for bookmarks) */}
          {itemType === 'bookmark' && selectedCategoryData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Bundle
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {selectedCategoryData.bundles.map((bundle: any) => (
                  <button
                    key={bundle.name}
                    onClick={() => setSelectedBundle(bundle.name)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                      selectedBundle === bundle.name ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    📦 {bundle.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedCategory || (itemType === 'bookmark' && !selectedBundle) || isCurrentLocation()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
};