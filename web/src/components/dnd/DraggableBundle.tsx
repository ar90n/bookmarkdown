import React from 'react';
import { useDrag } from 'react-dnd';
import { Bundle } from '../../../../../src/types/bookmark';

interface DraggableBundleProps {
  bundle: Bundle;
  categoryName: string;
  children: React.ReactNode;
}

interface DragItem {
  type: 'bundle';
  bundleName: string;
  categoryName: string;
}

export const DraggableBundle: React.FC<DraggableBundleProps> = ({
  bundle,
  categoryName,
  children
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'bundle',
    item: {
      type: 'bundle',
      bundleName: bundle.name,
      categoryName,
    } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      {children}
    </div>
  );
};