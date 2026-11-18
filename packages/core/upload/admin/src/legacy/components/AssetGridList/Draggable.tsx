import * as React from 'react';

import { useDrag, useDrop } from 'react-dnd';

interface DraggableProps {
  id: string | number;
  index: number;
  children: React.ReactNode;
  moveItem: (fromIndex: number, toIndex: number) => void;
}

export const Draggable = ({ children, id, index, moveItem }: DraggableProps) => {
  const ref = React.useRef(null);

  const [, drop] = useDrop({
    accept: 'draggable',
    hover(hoveredOverItem: { id: number; index: number }) {
      if (!ref.current) {
        return;
      }

      if (hoveredOverItem.id !== id) {
        moveItem(hoveredOverItem.index, index);

        hoveredOverItem.index = index;
      }
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'draggable',
    item() {
      return { index, id };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.2 : 1;

  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity, cursor: 'move' }}>
      {children}
    </div>
  );
};
