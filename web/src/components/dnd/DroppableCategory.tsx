import React from 'react';
import { useDrop } from 'react-dnd';
import { useBookmarkContext } from '../../contexts/AppProviderV2';

interface DroppableCategoryProps {
  categoryName: string;
  children: React.ReactNode;
}

interface DragItem {
  type: 'bundle';
  bundleName: string;
  categoryName: string;
}

export const DroppableCategory: React.FC<DroppableCategoryProps> = ({
  categoryName,
  children
}) => {
  const bookmark = useBookmarkContext();

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'bundle',
    canDrop: (item: DragItem) => {
      // Use service state for business logic
      return bookmark.canDropBundle(item.bundleName, item.categoryName, categoryName);
    },
    drop: async (item: DragItem) => {
      try {
        await bookmark.moveBundle(
          item.categoryName,
          categoryName,
          item.bundleName
        );
      } catch (error) {
        console.error('Failed to move bundle:', error);
        // The error will be handled by the context provider and shown in the UI
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  return (
    <div ref={drop}>
      {React.cloneElement(children as React.ReactElement, {
        categoryDropHighlight: isOver && canDrop,
      })}
    </div>
  );
};