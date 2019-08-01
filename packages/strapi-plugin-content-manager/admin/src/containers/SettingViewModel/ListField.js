import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { DragSource, DropTarget } from 'react-dnd';

import GrabIcon from '../../assets/images/icon_grab.svg';
import GrabIconBlue from '../../assets/images/icon_grab_blue.svg';
import ClickOverHint from '../../components/ClickOverHint';
import RemoveIcon from '../../components/DraggedRemovedIcon';
import EditIcon from '../../components/FieldEditIcon';
import { Field, InfoLabel, FullWidthCarret } from './components';

import ItemTypes from '../../utils/ItemTypes';
import { getEmptyImage } from 'react-dnd-html5-backend';

function ListField({
  index,
  isDragging,
  isSelected,
  label,
  name,
  onClick,
  onRemove,
  connectDragPreview,
  connectDragSource,
  connectDropTarget,
}) {
  const ref = useRef(null);

  useEffect(() => {
    connectDragPreview(getEmptyImage());
  }, [connectDragPreview]);

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
      isDragging={isDragging}
      isSelected={isSelected}
    >
      {isDragging ? (
        <div style={{ width: '100%', height: 30, background: 'transparent' }}>
          <FullWidthCarret>
            <div />
          </FullWidthCarret>
        </div>
      ) : (
        <>
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
        </>
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
  connectDragPreview: PropTypes.func.isRequired,
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
      connectDragPreview: connect.dragPreview(),
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging(),
    })
  )(ListField)
);
