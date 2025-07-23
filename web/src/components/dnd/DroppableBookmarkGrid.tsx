import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useBookmarkContext } from '../../contexts/AppProvider';
import { calculateDropIndex } from '../../lib/utils/dnd-helpers';
import { useMobile } from '../../hooks/useMobile';

interface DroppableBookmarkGridProps {
  categoryName: string;
  bundleName: string;
  bookmarkCount: number;
  children: React.ReactNode;
  className?: string;
}

interface DragItem {
  type: 'bookmark';
  bookmarkId: string;
  categoryName: string;
  bundleName: string;
  index?: number;
}

export const DroppableBookmarkGrid: React.FC<DroppableBookmarkGridProps> = ({
  categoryName,
  bundleName,
  bookmarkCount,
  children,
  className
}) => {
  const bookmark = useBookmarkContext();
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();

  // Always call hooks - React Rules of Hooks
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'bookmark',
    canDrop: (item: DragItem) => {
      // Disable dropping on mobile
      if (isMobile) return false;
      
      // Don't allow dropping in the same bundle (reordering is disabled)
      if (item.categoryName === categoryName && item.bundleName === bundleName) {
        return false;
      }
      return bookmark.canDropBookmark(item, categoryName, bundleName);
    },
    drop: async (item: DragItem, monitor) => {
      try {
        // Only allow moving between different bundles, no reordering within the same bundle
        if (item.categoryName === categoryName && item.bundleName === bundleName) {
          // Same bundle - do nothing (reordering is disabled)
          return;
        } else {
          // Different bundle - use move operation
          await bookmark.moveBookmark(
            item.categoryName,
            item.bundleName,
            categoryName,
            bundleName,
            item.bookmarkId
          );
        }
      } catch (error) {
        console.error('[DroppableBookmarkGrid ERROR] Failed to move bookmark:', error);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  // Combine refs
  const combinedRef = (node: HTMLDivElement) => {
    ref.current = node;
    if (!isMobile) {
      drop(node);
    }
  };

  // Don't apply drop functionality on mobile
  if (isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      ref={combinedRef}
      className={className}
      style={{
        backgroundColor: isOver && canDrop ? '#e6f3ff' : undefined,
        transition: 'background-color 0.2s ease',
      }}
    >
      {children}
    </div>
  );
};