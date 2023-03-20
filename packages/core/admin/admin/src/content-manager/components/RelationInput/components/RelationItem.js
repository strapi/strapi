import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { getEmptyImage } from 'react-dnd-html5-backend';

import { Box, Flex, IconButton } from '@strapi/design-system';
import { Drag } from '@strapi/icons';

import { useDragAndDrop } from '../../../hooks/useDragAndDrop';

import { composeRefs, ItemTypes } from '../../../utils';

import { RELATION_GUTTER } from '../constants';

export const FlexWrapper = styled(Flex)`
  width: 100%;
  /* Used to prevent endAction to be pushed out of container */
  min-width: 0;

  & > div[role='button'] {
    cursor: all-scroll;
  }
`;

export const ChildrenWrapper = styled(Flex)`
  width: 100%;
  /* Used to prevent endAction to be pushed out of container */
  min-width: 0;
`;

export const RelationItem = ({
  ariaDescribedBy,
  children,
  displayValue,
  canDrag,
  disabled,
  endAction,
  iconButtonAriaLabel,
  style,
  id,
  index,
  name,
  onCancel,
  onDropItem,
  onGrabItem,
  status,
  updatePositionOfRelation,
  ...props
}) => {
  const [{ handlerId, isDragging, handleKeyDown }, relationRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(canDrag && !disabled, {
      type: `${ItemTypes.RELATION}_${name}`,
      index,
      item: {
        displayedValue: displayValue,
        status,
        id,
      },
      onGrabItem,
      onDropItem,
      onCancel,
      onMoveItem: updatePositionOfRelation,
      dropSensitivity: 'immediate',
    });

  const composedRefs = composeRefs(relationRef, dragRef);

  useEffect(() => {
    dragPreviewRef(getEmptyImage());
  }, [dragPreviewRef]);

  return (
    <Box
      style={style}
      as="li"
      ref={dropRef}
      aria-describedby={ariaDescribedBy}
      cursor={canDrag ? 'all-scroll' : 'default'}
    >
      {isDragging ? (
        <RelationItemPlaceholder />
      ) : (
        <Flex
          paddingTop={2}
          paddingBottom={2}
          paddingLeft={canDrag ? 2 : 4}
          paddingRight={4}
          hasRadius
          borderSize={1}
          borderColor="neutral200"
          background={disabled ? 'neutral150' : 'neutral0'}
          justifyContent="space-between"
          ref={canDrag ? composedRefs : undefined}
          data-handler-id={handlerId}
          {...props}
        >
          <FlexWrapper gap={1}>
            {canDrag ? (
              <IconButton
                forwardedAs="div"
                role="button"
                tabIndex={0}
                aria-label={iconButtonAriaLabel}
                noBorder
                onKeyDown={handleKeyDown}
                disabled={disabled}
              >
                <Drag />
              </IconButton>
            ) : null}
            <ChildrenWrapper justifyContent="space-between">{children}</ChildrenWrapper>
          </FlexWrapper>
          {endAction && <Box paddingLeft={4}>{endAction}</Box>}
        </Flex>
      )}
    </Box>
  );
};

const RelationItemPlaceholder = () => (
  <Box
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
);

RelationItem.defaultProps = {
  ariaDescribedBy: '',
  canDrag: false,
  displayValue: '',
  disabled: false,
  endAction: undefined,
  onCancel: undefined,
  onDropItem: undefined,
  onGrabItem: undefined,
  style: undefined,
  status: undefined,
  updatePositionOfRelation: undefined,
};

RelationItem.propTypes = {
  ariaDescribedBy: PropTypes.string,
  canDrag: PropTypes.bool,
  children: PropTypes.node.isRequired,
  displayValue: PropTypes.string,
  disabled: PropTypes.bool,
  endAction: PropTypes.node,
  iconButtonAriaLabel: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  onCancel: PropTypes.func,
  onDropItem: PropTypes.func,
  onGrabItem: PropTypes.func,
  status: PropTypes.string,
  style: PropTypes.shape({
    height: PropTypes.number,
    left: PropTypes.number,
    position: PropTypes.string,
    right: PropTypes.number,
    width: PropTypes.string,
  }),
  updatePositionOfRelation: PropTypes.func,
};
