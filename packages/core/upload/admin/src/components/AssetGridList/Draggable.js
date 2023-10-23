import React, { useRef } from 'react';

import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';

export const Draggable = ({ children, id, index, moveItem }) => {
  const ref = useRef(null);

  const [, drop] = useDrop({
    accept: 'draggable',
    hover(hoveredOverItem) {
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

Draggable.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  index: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
  moveItem: PropTypes.func.isRequired,
};
