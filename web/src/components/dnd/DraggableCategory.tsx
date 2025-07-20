import React from 'react';
import { useDrag } from 'react-dnd';

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
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'category',
    item: {
      type: 'category',
      categoryName,
      index,
    } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [categoryName, index]);

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