import React, { forwardRef, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useDrag, useDrop } from 'react-dnd';

import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { IconButton } from '@strapi/design-system/IconButton';

import Drag from '@strapi/icons/Drag';

import { composeRefs } from '../../../utils';
import { RELATION_GUTTER } from '../constants';

const ChildrenWrapper = styled(Flex)`
  width: 100%;
  /* Used to prevent endAction to be pushed out of container */
  min-width: 0;
`;

const IconButtonWrapper = styled.div`
  margin-right: ${(props) => props.theme.spaces[1]};
`;

const RELATION_ITEM_DRAG_TYPE = 'RelationItem';

export const RelationItem = ({
  ariaDescribedBy,
  children,
  canDrag,
  disabled,
  endAction,
  iconButtonAriaLabel,
  style,
  id,
  index,
  onCancel,
  onDropItem,
  onGrabItem,
  updatePositionOfRelation,
  ...props
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const relationRef = useRef(null);

  const [{ handlerId }, dropRef] = useDrop({
    accept: RELATION_ITEM_DRAG_TYPE,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!relationRef.current) {
        return;
      }
      const dragIndex = item.index;
      const currentIndex = index;

      // Don't replace items with themselves
      if (dragIndex === currentIndex) {
        return;
      }

      const hoverBoundingRect = relationRef.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Dragging downwards
      if (dragIndex < currentIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > currentIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      if (updatePositionOfRelation) {
        updatePositionOfRelation(dragIndex, currentIndex);
        item.index = currentIndex;
      }
    },
  });

  const [{ isDragging }, dragRef, dragPreviewRef] = useDrag({
    type: RELATION_ITEM_DRAG_TYPE,
    item: { index },
    canDrag: canDrag && !disabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const composedRefs = composeRefs(relationRef, dragRef);

  /**
   * @type {(movement: 'UP' | 'DOWN') => void})}
   */
  const handleMove = (movement) => {
    if (!isSelected) {
      return;
    }

    if (movement === 'UP') {
      updatePositionOfRelation(index - 1, index);
    } else if (movement === 'DOWN') {
      updatePositionOfRelation(index + 1, index);
    }
  };

  const handleDragClick = () => {
    if (isSelected) {
      if (onDropItem) {
        onDropItem(index);
      }
      setIsSelected(false);
    } else {
      if (onGrabItem) {
        onGrabItem(index);
      }
      setIsSelected(true);
    }
  };

  const handleCancel = () => {
    setIsSelected(false);

    if (onCancel) {
      onCancel(index);
    }
  };

  /**
   * @type {React.KeyboardEventHandler<HTMLButtonElement>}
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && !isSelected) {
      return;
    }

    e.preventDefault();

    switch (e.key) {
      case ' ':
      case 'Enter':
        handleDragClick();
        break;

      case 'Escape':
        handleCancel();
        break;

      case 'ArrowDown':
      case 'ArrowRight':
        handleMove('DOWN');
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        handleMove('UP');
        break;

      default:
    }
  };

  return (
    <Box
      style={style}
      as="li"
      ref={dropRef}
      aria-describedby={ariaDescribedBy}
      cursor={canDrag ? 'all-scroll' : 'default'}
    >
      {isDragging ? (
        <RelationItemPlaceholder ref={dragPreviewRef} />
      ) : (
        <Flex
          paddingTop={2}
          paddingBottom={2}
          paddingLeft={canDrag ? 2 : 4}
          paddingRight={4}
          hasRadius
          borderSize={1}
          background={disabled ? 'neutral150' : 'neutral0'}
          borderColor="neutral200"
          justifyContent="space-between"
          ref={canDrag ? composedRefs : undefined}
          data-handler-id={handlerId}
          {...props}
        >
          {canDrag ? (
            <IconButtonWrapper>
              <IconButton
                forwardedAs="div"
                role="button"
                tabIndex={0}
                aria-label={iconButtonAriaLabel}
                noBorder
                onKeyDown={handleKeyDown}
              >
                <Drag />
              </IconButton>
            </IconButtonWrapper>
          ) : null}
          <ChildrenWrapper justifyContent="space-between">{children}</ChildrenWrapper>
          {endAction && <Box paddingLeft={4}>{endAction}</Box>}
        </Flex>
      )}
    </Box>
  );
};

const RelationItemPlaceholder = forwardRef((_, ref) => (
  <Box
    ref={ref}
    paddingTop={2}
    paddingBottom={2}
    paddingLeft={4}
    paddingRight={4}
    hasRadius
    borderStyle="dashed"
    borderColor="primary600"
    borderWidth="1px"
    background="primary100"
    height={`calc(100% - ${RELATION_GUTTER}px)`}
  />
));

RelationItem.defaultProps = {
  ariaDescribedBy: '',
  canDrag: false,
  disabled: false,
  endAction: undefined,
  onCancel: undefined,
  onDropItem: undefined,
  onGrabItem: undefined,
  style: undefined,
  updatePositionOfRelation: undefined,
};

RelationItem.propTypes = {
  ariaDescribedBy: PropTypes.string,
  canDrag: PropTypes.bool,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  endAction: PropTypes.node,
  iconButtonAriaLabel: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
  onCancel: PropTypes.func,
  onDropItem: PropTypes.func,
  onGrabItem: PropTypes.func,
  style: PropTypes.shape({
    height: PropTypes.number,
    left: PropTypes.number,
    position: PropTypes.string,
    right: PropTypes.number,
    width: PropTypes.string,
  }),
  updatePositionOfRelation: PropTypes.func,
};
