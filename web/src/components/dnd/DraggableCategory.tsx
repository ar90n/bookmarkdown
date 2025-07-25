import React from 'react';
import { useDrag } from 'react-dnd';
import { useMobile } from '../../hooks/useMobile';

interface DraggableCategoryProps {
  categoryName: string;
  index: number;
  children: React.ReactNode;
}

interface DragItem {
  type: 'category';
  categoryName: string;
  index: number;
}

export const DraggableCategory: React.FC<DraggableCategoryProps> = ({
  categoryName,
  index,
  children
}) => {
  const isMobile = useMobile();

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'category',
    item: {
      type: 'category',
      categoryName,
      index,
    } as DragItem,
    canDrag: () => !isMobile, // Disable dragging on mobile
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [categoryName, index, isMobile]);

  // Don't apply drag functionality on mobile
  if (isMobile) {
    return <div>{children}</div>;
  }

  return (
    <div
      ref={drag}
      data-category-item
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      {children}
    </div>
  );
};