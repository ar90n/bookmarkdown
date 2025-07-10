import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useMobile } from '../../hooks/useMobile';

interface DnDProviderProps {
  children: React.ReactNode;
}

export const DnDProvider: React.FC<DnDProviderProps> = ({ children }) => {
  const isMobile = useMobile();

  // On mobile, disable DnD to prevent conflicts with scrolling
  if (isMobile) {
    return <>{children}</>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      {children}
    </DndProvider>
  );
};