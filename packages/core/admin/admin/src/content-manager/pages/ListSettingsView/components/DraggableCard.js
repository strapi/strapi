import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { Flex, Box, Typography } from '@strapi/design-system';
import { Pencil, Cross, Drag } from '@strapi/icons';

import { CardDragPreview } from '../../App/components/CardDragPreview';
import { getTrad, ItemTypes } from '../../../utils';

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.spaces[7]};

  &:last-child {
    padding: 0 ${({ theme }) => theme.spaces[3]};
  }
`;

const DragButton = styled(ActionButton)`
  padding: 0 ${({ theme }) => theme.spaces[3]};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  cursor: all-scroll;

  svg {
    width: ${12 / 16}rem;
    height: ${12 / 16}rem;
  }
`;

const FieldContainer = styled(Flex)`
  max-height: ${32 / 16}rem;
  cursor: pointer;

  svg {
    width: ${10 / 16}rem;
    height: ${10 / 16}rem;

    path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary100};
    border-color: ${({ theme }) => theme.colors.primary200};

    svg {
      path {
        fill: ${({ theme }) => theme.colors.primary600};
      }
    }

    ${Typography} {
      color: ${({ theme }) => theme.colors.primary600};
    }

    ${DragButton} {
      border-right: 1px solid ${({ theme }) => theme.colors.primary200};
    }
  }
`;

const FieldWrapper = styled(Box)`
  &:last-child {
    padding-right: ${({ theme }) => theme.spaces[3]};
  }
`;

const DraggableCard = ({
  index,
  isDraggingSibling,
  labelField,
  onClickEditField,
  onMoveField,
  onRemoveField,
  name,
  setIsDraggingSibling,
}) => {
  const { formatMessage } = useIntl();
  const dragRef = useRef(null);
  const dropRef = useRef(null);
  const [, forceRerenderAfterDnd] = useState(false);
  const editButtonRef = useRef();

  const handleClickEditRow = () => {
    if (editButtonRef.current) {
      editButtonRef.current.click();
    }
  };

  // TODO: this can be simplified a lot by using the useDragAndDrop() hook
  const [, drop] = useDrop({
    accept: ItemTypes.FIELD,
    hover(item, monitor) {
      if (!dropRef.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = dropRef.current.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
        return;
      }
      // Dragging upwards
      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
        return;
      }

      onMoveField(dragIndex, hoverIndex);

      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.FIELD,
    item() {
      return { index, labelField, name };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end() {
      setIsDraggingSibling(false);
    },
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: false });
  }, [preview]);

  useEffect(() => {
    if (isDragging) {
      setIsDraggingSibling(true);
    }
  }, [isDragging, setIsDraggingSibling]);

  // Effect in order to force a rerender after reordering the components
  // Since we are removing the Accordion when doing the DnD  we are losing the dragRef, therefore the replaced element cannot be dragged
  // anymore, this hack forces a rerender in order to apply the dragRef
  useEffect(() => {
    if (!isDraggingSibling) {
      forceRerenderAfterDnd((prev) => !prev);
    }
  }, [isDraggingSibling]);

  // Create the refs
  // We need 1 for the drop target
  // 1 for the drag target
  const refs = {
    dragRef: drag(dragRef),
    dropRef: drop(dropRef),
  };

  return (
    <FieldWrapper ref={refs ? refs.dropRef : null}>
      {isDragging && <CardDragPreview transparent labelField={labelField} />}
      {!isDragging && isDraggingSibling && <CardDragPreview isSibling labelField={labelField} />}

      {!isDragging && !isDraggingSibling && (
        <FieldContainer
          borderColor="neutral150"
          background="neutral100"
          hasRadius
          justifyContent="space-between"
          onClick={handleClickEditRow}
          isDragging={isDragging}
        >
          <Flex gap={3}>
            <DragButton
              as="span"
              aria-label={formatMessage(
                {
                  id: getTrad('components.DraggableCard.move.field'),
                  defaultMessage: 'Move {item}',
                },
                { item: labelField }
              )}
              onClick={(e) => e.stopPropagation()}
              ref={refs.dragRef}
              type="button"
            >
              <Drag />
            </DragButton>
            <Typography fontWeight="bold">{labelField}</Typography>
          </Flex>
          <Flex paddingLeft={3}>
            <ActionButton
              ref={editButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                onClickEditField(name);
              }}
              aria-label={formatMessage(
                {
                  id: getTrad('components.DraggableCard.edit.field'),
                  defaultMessage: 'Edit {item}',
                },
                { item: labelField }
              )}
              type="button"
            >
              <Pencil />
            </ActionButton>
            <ActionButton
              onClick={onRemoveField}
              data-testid={`delete-${name}`}
              aria-label={formatMessage(
                {
                  id: getTrad('components.DraggableCard.delete.field'),
                  defaultMessage: 'Delete {item}',
                },
                { item: labelField }
              )}
              type="button"
            >
              <Cross />
            </ActionButton>
          </Flex>
        </FieldContainer>
      )}
    </FieldWrapper>
  );
};

DraggableCard.propTypes = {
  index: PropTypes.number.isRequired,
  isDraggingSibling: PropTypes.bool.isRequired,
  labelField: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onClickEditField: PropTypes.func.isRequired,
  onMoveField: PropTypes.func.isRequired,
  onRemoveField: PropTypes.func.isRequired,
  setIsDraggingSibling: PropTypes.func.isRequired,
};

export default DraggableCard;
