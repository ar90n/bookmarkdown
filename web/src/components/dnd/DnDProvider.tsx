import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface DnDProviderProps {
  children: React.ReactNode;
}

export const DnDProvider: React.FC<DnDProviderProps> = ({ children }) => {
  // Always render DndProvider to ensure context is available
  // Individual components will check for mobile and disable drag functionality
  return (
    <DndProvider backend={HTML5Backend}>
      {children}
    </DndProvider>
  );
};