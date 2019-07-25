import React, { useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { useLayoutDnd } from '../../contexts/LayoutDnd';

import FieldItem from '../FieldItem';

import ItemTypes from '../../utils/ItemTypes';

const Item = ({ index, move, name, removeItem }) => {
  const {
    goTo,
    metadatas,
    selectedItemName,
    setEditFieldToSelect,
  } = useLayoutDnd();
  const ref = useRef(null);

  // from: https://codesandbox.io/s/github/react-dnd/react-dnd/tree/gh-pages/examples_hooks_js/04-sortable/simple?from-embed
  const [, drop] = useDrop({
    accept: ItemTypes.EDIT_RELATION,
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      // Time to actually perform the action
      move(dragIndex, hoverIndex);
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });
  const [{ isDragging }, drag, preview] = useDrag({
    begin() {
      setEditFieldToSelect(name, 'relation');
    },
    item: { type: ItemTypes.EDIT_RELATION, id: name, name, index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  drag(drop(ref));

  return (
    <FieldItem
      isDragging={isDragging}
      isSelected={name === selectedItemName}
      label={get(metadatas, [name, 'edit', 'label'], '')}
      name={name}
      onClickEdit={() => setEditFieldToSelect(name, 'relation')}
      onClickRemove={() => removeItem(index)}
      push={goTo}
      ref={ref}
      size={12}
      style={{ marginBottom: 6 }}
    />
  );
};

Item.defaultProps = {
  move: () => {},
};

Item.propTypes = {
  index: PropTypes.number.isRequired,
  move: PropTypes.func,
  name: PropTypes.string.isRequired,
  removeItem: PropTypes.func.isRequired,
};

export default Item;
