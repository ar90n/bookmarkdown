import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useBookmarkContext } from '../../contexts/AppProvider';
import { calculateBundleDropIndex } from '../../lib/utils/dnd-helpers';
import { useMobile } from '../../hooks/useMobile';

interface DroppableCategoryProps {
  categoryName: string;
  bundleCount: number;
  children: React.ReactNode;
}

interface DragItem {
  type: 'bundle';
  bundleName: string;
  categoryName: string;
  index?: number;
}

export const DroppableCategory: React.FC<DroppableCategoryProps> = ({
  categoryName,
  bundleCount,
  children
}) => {
  const bookmark = useBookmarkContext();
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();

  // Return early for mobile to avoid DnD hooks
  if (isMobile) {
    return <>{children}</>;
  }

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'bundle',
    canDrop: (item: DragItem) => {
      // Use service state for business logic
      return bookmark.canDropBundle(item.bundleName, item.categoryName, categoryName);
    },
    drop: async (item: DragItem, monitor) => {
      try {
        // Check if this is a reorder within the same category
        if (item.categoryName === categoryName) {
          // Calculate drop index based on mouse position
          const clientOffset = monitor.getClientOffset();
          if (clientOffset && ref.current) {
            const dropIndex = calculateBundleDropIndex(ref.current, clientOffset, bundleCount);
            
            // Only reorder if the index has changed
            if (item.index !== undefined && dropIndex !== item.index) {
              await bookmark.reorderBundles(
                categoryName,
                item.bundleName,
                dropIndex
              );
            }
          }
        } else {
          // Different category - use move operation
          await bookmark.moveBundle(
            item.categoryName,
            categoryName,
            item.bundleName
          );
        }
      } catch (error) {
        console.error('Failed to move/reorder bundle:', error);
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
    drop(node);
  };

  return (
    <div ref={combinedRef}>
      {React.cloneElement(children as React.ReactElement, {
        categoryDropHighlight: isOver && canDrop,
      })}
    </div>
  );
};