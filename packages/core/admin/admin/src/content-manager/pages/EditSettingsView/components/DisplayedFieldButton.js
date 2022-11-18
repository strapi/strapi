import React, { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useDrop, useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { Flex, Box, GridItem } from '@strapi/design-system';
import Drag from '@strapi/icons/Drag';
import { ItemTypes } from '../../../utils';
import FieldButtonContent from './FieldButtonContent';
import { useLayoutDnd } from '../../../hooks';

const Wrapper = styled(Flex)`
  position: relative;
  ${({ isFirst, isLast, hasHorizontalPadding }) => {
    if (isFirst) {
      return `
        padding-right: 4px;
      `;
    }
    if (isLast) {
      return `
        padding-left: 4px;
      `;
    }

    if (hasHorizontalPadding) {
      return `
        padding: 0 4px;
      `;
    }

    return '';
  }}
  ${({ showRightCarret, showLeftCarret, theme }) => {
    if (showRightCarret) {
      return `
        &:after {
          content: '';
          position: absolute;
          right: -1px;
          background-color: ${theme.colors.primary600};
          width: 2px;
          height: 100%;
          align-self: stretch;
          z-index: 1;
        }
      `;
    }

    if (showLeftCarret) {
      return `
        &:before {
          content: '';
          position: absolute;
          left: -1px;
          background-color: ${theme.colors.primary600};
          width: 2px;
          height: 100%;
          align-self: stretch;
          z-index: 1;
        }
      `;
    }

    return '';
  }};
`;
const CustomDragIcon = styled(Drag)`
  height: ${12 / 16}rem;
  width: ${12 / 16}rem;
  path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;
const CustomFlex = styled(Flex)`
  display: ${({ dragStart }) => (dragStart ? 'none' : 'flex')};
  opacity: ${({ isDragging, isFullSize, isHidden }) => {
    if (isDragging && !isFullSize) {
      return 0.2;
    }

    if ((isDragging && isFullSize) || isHidden) {
      return 0;
    }

    return 1;
  }};
`;
const DragButton = styled(Flex)`
  cursor: all-scroll;
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
`;

const DisplayedFieldButton = ({
  attribute,
  children,
  index,
  lastIndex,
  moveItem,
  moveRow,
  name,
  onDeleteField,
  onEditField,
  rowIndex,
  size,
}) => {
  const [dragStart, setDragStart] = useState(false);
  const isHidden = name === '_TEMP_';
  const { setIsDraggingSibling } = useLayoutDnd();
  const isFullSize = size === 12;

  const dragRef = useRef(null);
  const dropRef = useRef(null);
  const [{ clientOffset, isOver }, drop] = useDrop({
    accept: ItemTypes.EDIT_FIELD,
    hover(item, monitor) {
      if (!dropRef.current) {
        return;
      }

      // We use the hover only to reorder full size items
      if (item.size !== 12) {
        return;
      }

      const dragIndex = monitor.getItem().index;
      const hoverIndex = index;
      const dragRow = monitor.getItem().rowIndex;
      const targetRow = rowIndex;

      // Don't replace item with themselves
      if (dragIndex === hoverIndex && dragRow === targetRow) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = dropRef.current.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragRow < targetRow && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragRow > targetRow && hoverClientY > hoverMiddleY) {
        return;
      }

      moveRow(dragRow, targetRow);

      item.rowIndex = targetRow;
      item.itemIndex = hoverIndex;
    },
    drop(item, monitor) {
      if (!dropRef.current) {
        return;
      }

      const dragIndex = monitor.getItem().index;
      const hoverIndex = index;
      const dragRow = monitor.getItem().rowIndex;
      const targetRow = rowIndex;

      // Don't reorder on drop for full size elements since it is already done in the hover
      if (item.size === 12) {
        return;
      }

      // Don't replace item with themselves
      if (dragIndex === hoverIndex && dragRow === targetRow) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = dropRef.current.getBoundingClientRect();

      // Scroll window if mouse near vertical edge(100px)

      // Horizontal Check --
      if (
        Math.abs(monitor.getClientOffset().x - hoverBoundingRect.left) >
        hoverBoundingRect.width / 1.8
      ) {
        moveItem(dragIndex, hoverIndex + 1, dragRow, targetRow);

        item.itemIndex = hoverIndex + 1;
        item.rowIndex = targetRow;

        return;
      }

      // Vertical Check |

      // Time to actually perform the action
      moveItem(dragIndex, hoverIndex, dragRow, targetRow);
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.

      item.itemIndex = hoverIndex;
      item.rowIndex = targetRow;
    },
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
      clientOffset: monitor.getClientOffset(),
      isOver: monitor.isOver(),
      isOverCurrent: monitor.isOver({ shallow: true }),
      itemType: monitor.getItemType(),
    }),
  });
  const [{ isDragging, getItem }, drag, dragPreview] = useDrag({
    type: ItemTypes.EDIT_FIELD,
    item() {
      setIsDraggingSibling(true);

      return {
        index,
        labelField: children,
        rowIndex,
        name,
        size,
      };
    },
    canDrag() {
      // Each row of the layout has a max size of 12 (based on bootstrap grid system)
      // So in order to offer a better drop zone we add the _TEMP_ div to complete the remaining substract (12 - existing)
      // Those divs cannot be dragged
      // If we wanted to offer the ability to create new lines in the layout (which will come later)
      // We will need to add a 12 size _TEMP_ div to offer a drop target between each existing row.
      return name !== '_TEMP_';
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      getItem: monitor.getItem(),
    }),
    end() {
      setIsDraggingSibling(false);
    },
  });

  // Remove the default preview when the item is being dragged
  // The preview is handled by the DragLayer
  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

  // Create the refs
  // We need 1 for the drop target
  // 1 for the drag target
  const refs = {
    dragRef: drag(dragRef),
    dropRef: drop(dropRef),
  };

  let showLeftCarret = false;
  let showRightCarret = false;

  if (dropRef.current && clientOffset) {
    const hoverBoundingRect = dropRef.current.getBoundingClientRect();

    showLeftCarret =
      isOver &&
      getItem.size !== 12 &&
      Math.abs(clientOffset.x - hoverBoundingRect.left) < hoverBoundingRect.width / 2;
    showRightCarret =
      isOver &&
      getItem.size !== 12 &&
      Math.abs(clientOffset.x - hoverBoundingRect.left) > hoverBoundingRect.width / 2;

    if (name === '_TEMP_') {
      showLeftCarret = isOver && getItem.size !== 12;
      showRightCarret = false;
    }
  }

  const getHeight = () => {
    if (attribute && isFullSize) {
      return `${74 / 16}rem`;
    }

    return `${32 / 16}rem`;
  };

  const isFirst = index === 0 && !isFullSize;
  const isLast = index === lastIndex && !isFullSize;
  const hasHorizontalPadding = index !== 0 && !isFullSize;

  return (
    <GridItem col={size}>
      <Wrapper
        ref={refs.dropRef}
        showLeftCarret={showLeftCarret}
        showRightCarret={showRightCarret}
        isFirst={isFirst}
        isLast={isLast}
        hasHorizontalPadding={hasHorizontalPadding}
        onDrag={() => {
          if (isFullSize && !dragStart) {
            setDragStart(true);
          }
        }}
        onDragEnd={() => {
          if (isFullSize) {
            setDragStart(false);
          }
        }}
      >
        {dragStart && isFullSize && (
          <Box
            // style={{ display: isDragging ? 'block' : 'none' }}
            width="100%"
            height="2px"
            background="primary600"
          />
        )}
        <CustomFlex
          width={isFullSize && dragStart ? 0 : '100%'}
          borderColor="neutral150"
          hasRadius
          background="neutral100"
          minHeight={getHeight()}
          alignItems="stretch"
          isDragging={isDragging}
          dragStart={dragStart}
          isFullSize={isFullSize}
          isHidden={isHidden}
        >
          <DragButton
            as="span"
            type="button"
            ref={refs.dragRef}
            onClick={(e) => e.stopPropagation()}
            alignItems="center"
            paddingLeft={3}
            paddingRight={3}
            // Disable the keyboard navigation since the drag n drop isn't accessible with the keyboard for the moment
            tabIndex={-1}
          >
            <CustomDragIcon />
          </DragButton>
          {!isHidden && (
            <FieldButtonContent
              attribute={attribute}
              onEditField={onEditField}
              onDeleteField={onDeleteField}
            >
              {children}
            </FieldButtonContent>
          )}
        </CustomFlex>
      </Wrapper>
    </GridItem>
  );
};

DisplayedFieldButton.defaultProps = {
  attribute: undefined,
};

DisplayedFieldButton.propTypes = {
  attribute: PropTypes.shape({
    components: PropTypes.array,
    component: PropTypes.string,
    type: PropTypes.string,
  }),
  children: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  moveItem: PropTypes.func.isRequired,
  moveRow: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  onDeleteField: PropTypes.func.isRequired,
  onEditField: PropTypes.func.isRequired,
  rowIndex: PropTypes.number.isRequired,
  lastIndex: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
};

export default DisplayedFieldButton;
