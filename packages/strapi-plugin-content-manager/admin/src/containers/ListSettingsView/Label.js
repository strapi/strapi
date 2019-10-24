import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import ItemTypes from '../../utils/ItemTypes';
import DraggedField from '../../components/DraggedField';

const Label = ({
  count,
  index,
  isDraggingSibling,
  move,
  name,
  onClick,
  onRemove,
  selectedItem,
  setIsDraggingSibling,
}) => {
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
    begin: () => {
      setIsDraggingSibling(true);
    },
    end: () => {
      setIsDraggingSibling(false);
    },
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
      isDraggingSibling={isDraggingSibling}
      name={name}
      onClick={onClick}
      onRemove={onRemove}
      selectedItem={selectedItem}
    />
  );
};

Label.defaultProps = {
  index: 0,
  isDraggingSibling: false,
  move: () => {},
  selectedItem: '',
  setIsDraggingSibling: () => {},
};

Label.propTypes = {
  count: PropTypes.number.isRequired,
  index: PropTypes.number,
  isDraggingSibling: PropTypes.bool,
  move: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  selectedItem: PropTypes.string,
  setIsDraggingSibling: PropTypes.func,
};

export default Label;
