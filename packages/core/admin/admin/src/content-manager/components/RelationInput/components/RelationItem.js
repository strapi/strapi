import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

import { Box, Flex, Stack, IconButton } from '@strapi/design-system';
import { Drag } from '@strapi/icons';

import { useDragAndDrop } from '../../../hooks/useDragAndDrop';

import { composeRefs } from '../../../utils';
import { RELATION_GUTTER } from '../constants';

const StackWrapper = styled(Stack)`
  width: 100%;
  /* Used to prevent endAction to be pushed out of container */
  min-width: 0;
`;

const ChildrenWrapper = styled(Flex)`
  width: 100%;
  /* Used to prevent endAction to be pushed out of container */
  min-width: 0;
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
  const [{ handlerId, isDragging, handleKeyDown }, relationRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(canDrag && !disabled, {
      type: RELATION_ITEM_DRAG_TYPE,
      index,
      onGrabItem,
      onDropItem,
      onCancel,
      onMoveItem: updatePositionOfRelation,
    });

  const composedRefs = composeRefs(relationRef, dragRef);

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
          <StackWrapper spacing={1} horizontal>
            {canDrag ? (
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
            ) : null}
            <ChildrenWrapper justifyContent="space-between">{children}</ChildrenWrapper>
          </StackWrapper>
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
