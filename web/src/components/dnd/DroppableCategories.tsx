import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useBookmarkContext } from '../../contexts/AppProvider';
import { calculateCategoryDropIndex } from '../../lib/utils/dnd-helpers';
import { useMobile } from '../../hooks/useMobile';

interface DroppableCategoriesProps {
  children: React.ReactNode;
  categoryCount: number;
}

interface DragItem {
  type: 'category';
  categoryName: string;
  index?: number;
}

export const DroppableCategories: React.FC<DroppableCategoriesProps> = ({
  children,
  categoryCount
}) => {
  const bookmark = useBookmarkContext();
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();

  // Always call hooks - React Rules of Hooks
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'category',
    canDrop: () => !isMobile, // Disable dropping on mobile
    drop: async (item: DragItem, monitor) => {
      try {
        // Calculate drop index based on mouse position
        const clientOffset = monitor.getClientOffset();
        if (clientOffset && ref.current) {
          const dropIndex = calculateCategoryDropIndex(ref.current, clientOffset, categoryCount);
          
          // Only reorder if the index has changed
          if (item.index !== undefined && dropIndex !== item.index) {
            await bookmark.reorderCategories(
              item.categoryName,
              dropIndex
            );
          }
        }
      } catch (error) {
        console.error('[DROP ERROR] Failed to reorder category:', error);
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