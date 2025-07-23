import React, { useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { Bookmark } from '../../../../../src/types/bookmark';
import { useBookmarkContext } from '../../contexts/AppProvider';
import { useMobile } from '../../hooks/useMobile';

interface DraggableBookmarkProps {
  bookmark: Bookmark;
  categoryName: string;
  bundleName: string;
  index: number;
  children: React.ReactNode;
}

interface DragItem {
  type: 'bookmark';
  bookmarkId: string;
  categoryName: string;
  bundleName: string;
  index: number;
}

export const DraggableBookmark: React.FC<DraggableBookmarkProps> = ({
  bookmark,
  categoryName,
  bundleName,
  index,
  children
}) => {
  const bookmarkContext = useBookmarkContext();
  const isMobile = useMobile();

  // Validate that the bookmark still exists in the service state
  useEffect(() => {
    const bookmarkExists = bookmarkContext.canDragBookmark(categoryName, bundleName, bookmark.id);
    
    if (!bookmarkExists) {
      console.warn(`Bookmark ${bookmark.id} not found in service state. UI might be stale.`);
    }
  }, [bookmarkContext, bookmark.id, categoryName, bundleName]);

  // Return early for mobile to avoid DnD hooks
  if (isMobile) {
    return <>{children}</>;
  }

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'bookmark',
    item: {
      type: 'bookmark',
      bookmarkId: bookmark.id,
      categoryName,
      bundleName,
      index,
    } as DragItem,
    canDrag: () => {
      // Use service state for business logic
      const canDrag = bookmarkContext.canDragBookmark(categoryName, bundleName, bookmark.id);
      
      return canDrag;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [bookmark, categoryName, bundleName, index, bookmarkContext]);

  // Don't apply drag functionality on mobile
  if (isMobile) {
    return <>{children}</>;
  }

  return (
    <div
      ref={drag}
      data-bookmark-item
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      {children}
    </div>
  );
};