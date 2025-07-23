import React from 'react';
import { useDrag } from 'react-dnd';
import { Bundle } from '../../../../../src/types/bookmark';
import { useMobile } from '../../hooks/useMobile';

interface DraggableBundleProps {
  bundle: Bundle;
  categoryName: string;
  index: number;
  children: React.ReactNode;
}

interface DragItem {
  type: 'bundle';
  bundleName: string;
  categoryName: string;
  index: number;
}

export const DraggableBundle: React.FC<DraggableBundleProps> = ({
  bundle,
  categoryName,
  index,
  children
}) => {
  const isMobile = useMobile();

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'bundle',
    item: {
      type: 'bundle',
      bundleName: bundle.name,
      categoryName,
      index,
    } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [bundle, categoryName, index]);

  // Don't apply drag functionality on mobile
  if (isMobile) {
    return <div>{children}</div>;
  }

  return (
    <div
      ref={drag}
      data-bundle-item
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      {children}
    </div>
  );
};