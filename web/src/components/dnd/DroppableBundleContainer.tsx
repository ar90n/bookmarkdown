import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useBookmarkContext } from '../../contexts/AppProvider';
import { calculateBundleDropIndex } from '../../lib/utils/dnd-helpers';
import { useMobile } from '../../hooks/useMobile';

interface DroppableBundleContainerProps {
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

export const DroppableBundleContainer: React.FC<DroppableBundleContainerProps> = ({
  categoryName,
  bundleCount,
  children
}) => {
  const bookmark = useBookmarkContext();
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'bundle',
    canDrop: (item: DragItem) => {
      // Only allow reordering within the same category for now
      return item.categoryName === categoryName;
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
        }
      } catch (error) {
        console.error('[DroppableBundleContainer] Failed to reorder bundle:', error);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
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
    return <div>{children}</div>;
  }

  return (
    <div 
      ref={combinedRef}
      style={{
        backgroundColor: isOver ? '#f0f9ff' : undefined,
        transition: 'background-color 0.2s ease',
      }}
    >
      {children}
    </div>
  );
};