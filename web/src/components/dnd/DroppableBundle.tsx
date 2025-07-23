import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useBookmarkContext } from '../../contexts/AppProvider';
import { calculateDropIndex } from '../../lib/utils/dnd-helpers';
import { useMobile } from '../../hooks/useMobile';

interface DroppableBundleProps {
  categoryName: string;
  bundleName: string;
  children: React.ReactNode;
  bookmarkCount?: number;
}

interface DragItem {
  type: 'bookmark';
  bookmarkId: string;
  categoryName: string;
  bundleName: string;
  index?: number;
}

export const DroppableBundle: React.FC<DroppableBundleProps> = ({
  categoryName,
  bundleName,
  children,
  bookmarkCount = 0
}) => {
  const bookmark = useBookmarkContext();
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'bookmark',
    canDrop: (item: DragItem) => {
      // Disable dropping on mobile
      if (isMobile) return false;
      
      // Use service state for business logic
      return bookmark.canDropBookmark(item, categoryName, bundleName);
    },
    drop: async (item: DragItem, monitor) => {
      try {
        // Check if this is a reorder within the same bundle
        if (item.categoryName === categoryName && item.bundleName === bundleName) {
          // Calculate drop index based on mouse position
          const clientOffset = monitor.getClientOffset();
          if (clientOffset && ref.current) {
            const dropIndex = calculateDropIndex(ref.current, clientOffset, bookmarkCount);
            
            // Only reorder if the index has changed
            if (item.index !== undefined && dropIndex !== item.index) {
              await bookmark.reorderBookmarks(
                categoryName,
                bundleName,
                item.bookmarkId,
                dropIndex
              );
            }
          }
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
        console.error('[DROP ERROR] Failed to move/reorder bookmark:', error);
        // The error will be handled by the context provider and shown in the UI
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
    return <>{children}</>;
  }

  return (
    <div ref={combinedRef}>
      {React.cloneElement(children as React.ReactElement, {
        bundleDropHighlight: isOver && canDrop,
      })}
    </div>
  );
};