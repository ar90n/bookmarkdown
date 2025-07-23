import React, { useState, useRef, useEffect } from 'react';

interface MobileMenuProps {
  onMove?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  onMove,
  onEdit,
  onDelete,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleMenuClick = (e: React.MouseEvent | React.TouchEvent, action: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    action();
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Options menu"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="13" cy="8" r="1.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
          {onMove && (
            <button
              onClick={(e) => handleMenuClick(e, onMove)}
              onTouchEnd={(e) => handleMenuClick(e, onMove)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <span>📁</span>
              <span>Move</span>
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => handleMenuClick(e, onEdit)}
              onTouchEnd={(e) => handleMenuClick(e, onEdit)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <span>✏️</span>
              <span>Edit</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => handleMenuClick(e, onDelete)}
              onTouchEnd={(e) => handleMenuClick(e, onDelete)}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
            >
              <span>🗑️</span>
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};