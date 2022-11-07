import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useDrag, useDrop } from 'react-dnd';

import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { IconButton } from '@strapi/design-system/IconButton';

import Drag from '@strapi/icons/Drag';

import { composeRefs } from '../../../utils';

const ChildrenWrapper = styled(Flex)`
  width: 100%;
  /* Used to prevent endAction to be pushed out of container */
  min-width: 0;
`;

const RELATION_ITEM_DRAG_TYPE = 'RelationItem';

export const RelationItem = ({
  children,
  canDrag,
  disabled,
  endAction,
  style,
  id,
  index,
  updatePositionOfRelation,
  ...props
}) => {
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
      updatePositionOfRelation(dragIndex, currentIndex);

      item.index = currentIndex;
    },
  });

  const [{ isDragging }, dragRef, dragPreviewRef] = useDrag({
    type: RELATION_ITEM_DRAG_TYPE,
    item: { index },
    canDrag,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const composedRefs = composeRefs(relationRef, dragRef);

  return (
    <Box style={style} as="li" ref={dropRef}>
      {isDragging ? (
        <Box
          ref={dragPreviewRef}
          paddingTop={2}
          paddingBottom={2}
          paddingLeft={4}
          paddingRight={4}
          hasRadius
          borderStyle="dashed"
          borderColor="primary600"
          borderWidth="1px"
          background="primary100"
          height="100%"
        />
      ) : (
        <Flex
          draggable={canDrag}
          paddingTop={2}
          paddingBottom={2}
          paddingLeft={canDrag ? 2 : 4}
          paddingRight={4}
          hasRadius
          borderSize={1}
          background={disabled ? 'neutral150' : 'neutral0'}
          borderColor="neutral200"
          justifyContent="space-between"
          ref={composedRefs}
          data-handler-id={handlerId}
          {...props}
        >
          {/* TODO: swap this out for using children when DS is updated */}
          {canDrag ? (
            <IconButton marginRight={1} aria-label="Drag" noBorder icon={<Drag />} />
          ) : null}
          <ChildrenWrapper justifyContent="space-between">{children}</ChildrenWrapper>
          {endAction && <Box paddingLeft={4}>{endAction}</Box>}
        </Flex>
      )}
    </Box>
  );
};

RelationItem.defaultProps = {
  canDrag: false,
  disabled: false,
  endAction: undefined,
  style: undefined,
};

RelationItem.propTypes = {
  canDrag: PropTypes.bool,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  endAction: PropTypes.node,
  id: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
  style: PropTypes.shape({
    height: PropTypes.number,
    left: PropTypes.number,
    position: PropTypes.string,
    right: PropTypes.number,
    width: PropTypes.string,
  }),
  updatePositionOfRelation: PropTypes.func.isRequired,
};
