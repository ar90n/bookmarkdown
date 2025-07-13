import React from 'react';
import { useDrop } from 'react-dnd';
import { useBookmarkContext } from '../../contexts/AppProviderV2';

interface DroppableBundleProps {
  categoryName: string;
  bundleName: string;
  children: React.ReactNode;
}

interface DragItem {
  type: 'bookmark';
  bookmarkId: string;
  categoryName: string;
  bundleName: string;
}

export const DroppableBundle: React.FC<DroppableBundleProps> = ({
  categoryName,
  bundleName,
  children
}) => {
  const bookmark = useBookmarkContext();

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'bookmark',
    canDrop: (item: DragItem) => {
      // Use service state for business logic
      return bookmark.canDropBookmark(item, categoryName, bundleName);
    },
    drop: async (item: DragItem) => {
      try {
        // Use simple move operation
        await bookmark.moveBookmark(
          item.categoryName,
          item.bundleName,
          categoryName,
          bundleName,
          item.bookmarkId
        );
        
      } catch (error) {
        console.error('[DROP ERROR] Failed to move bookmark:', error);
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
        bundleDropHighlight: isOver && canDrop,
      })}
    </div>
  );
};