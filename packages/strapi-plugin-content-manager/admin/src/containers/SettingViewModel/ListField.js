import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { DragSource, DropTarget } from 'react-dnd';

import GrabIcon from '../../assets/images/icon_grab.svg';
import GrabIconBlue from '../../assets/images/icon_grab_blue.svg';
import ClickOverHint from '../../components/ClickOverHint';
import RemoveIcon from '../../components/DraggedRemovedIcon';
import EditIcon from '../../components/VariableEditIcon';
import { Field, InfoLabel } from './components';

import ItemTypes from '../../utils/itemsTypes';

function ListField({
  index,
  isDragging,
  isSelected,
  label,
  name,
  onClick,
  onRemove,
  connectDragSource,
  connectDropTarget,
}) {
  const opacity = isDragging ? 0.2 : 1;

  const ref = useRef(null);
  const [isOver, setIsOver] = useState(false);
  const showLabel =
    (!isOver || isSelected) && label.toLowerCase() !== name.toLowerCase();

  connectDragSource(ref);
  connectDropTarget(ref);

  return (
    <Field
      onMouseEnter={() => setIsOver(true)}
      onMouseLeave={() => setIsOver(false)}
      onClick={() => {
        onClick(index);
      }}
      ref={ref}
      isSelected={isSelected}
      style={{ opacity }}
    >
      <img src={isSelected ? GrabIconBlue : GrabIcon} />
      <span>{name}</span>
      <ClickOverHint show={isOver && !isSelected} />
      {showLabel && <InfoLabel>{label}</InfoLabel>}
      {isSelected && !isOver ? (
        <EditIcon />
      ) : (
        <RemoveIcon
          isDragging={isSelected && isOver}
          onRemove={e => {
            e.stopPropagation();
            onRemove(index);
          }}
        />
      )}
    </Field>
  );
}

ListField.defaultProps = {
  label: '',
  move: () => {},
  onClick: () => {},
  onRemove: () => {},
};

ListField.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  isDragging: PropTypes.bool.isRequired,
  isSelected: PropTypes.bool.isRequired,
  label: PropTypes.string,
  move: PropTypes.func,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
};

export default DropTarget(
  ItemTypes.FIELD,
  {
    canDrop: () => false,
    hover(props, monitor) {
      const { id: draggedId } = monitor.getItem();
      const { name: overId } = props;

      if (draggedId !== overId) {
        const { index: overIndex } = props.findField(overId);
        props.move(draggedId, overIndex);
      }
    },
  },
  connect => ({
    connectDropTarget: connect.dropTarget(),
  })
)(
  DragSource(
    ItemTypes.FIELD,
    {
      beginDrag: props => {
        return {
          id: props.name,
          originalIndex: props.findField(props.name).index,
        };
      },

      endDrag(props, monitor) {
        const { id: droppedId, originalIndex } = monitor.getItem();
        const didDrop = monitor.didDrop();

        if (!didDrop) {
          props.move(droppedId, originalIndex);
        }
      },
    },
    (connect, monitor) => ({
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging(),
    })
  )(ListField)
);
