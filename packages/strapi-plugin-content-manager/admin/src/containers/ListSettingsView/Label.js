import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import ItemTypes from '../../utils/ItemTypes';
import DraggedField from '../../components/DraggedField';

const Label = ({ count, index, move, name, onClick, onRemove }) => {
  const ref = useRef(null);
  const [, drop] = useDrop({
    accept: ItemTypes.FIELD,
    hover(item) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      move(dragIndex, hoverIndex);

      item.index = hoverIndex;
    },
  });
  const [{ isDragging }, drag, preview] = useDrag({
    item: { type: ItemTypes.FIELD, id: name, name, index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  drag(drop(ref));

  return (
    <DraggedField
      count={count}
      ref={ref}
      isDragging={isDragging}
      name={name}
      onClick={onClick}
      onRemove={onRemove}
    />
  );
};

Label.defaultProps = {
  index: 0,
  move: () => {},
};

Label.propTypes = {
  count: PropTypes.number.isRequired,
  index: PropTypes.number,
  move: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default Label;
