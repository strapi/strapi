import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useDrop, useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { Flex } from '@strapi/design-system/Flex';
import Drag from '@strapi/icons/Drag';
import { ItemTypes } from '../../../utils';
import FieldButtonContent from './FieldButtonContent';

const CustomDragIcon = styled(Drag)`
  height: ${12 / 16}rem;
  width: ${12 / 16}rem;
  path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;
const CustomFlex = styled(Flex)`
  opacity: ${({ isDragging }) => (isDragging ? 0 : 1)};
`;
const DragButton = styled(Flex)`
  cursor: all-scroll;
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
`;

const RelationalFieldButton = ({
  attribute,
  onEditField,
  onDeleteField,
  children,
  index,
  name,
  onMoveField,
}) => {
  const dragButtonRef = useRef();

  const [, drop] = useDrop({
    accept: ItemTypes.EDIT_RELATION,
    hover(item) {
      if (!dragButtonRef.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      onMoveField(dragIndex, hoverIndex);

      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: ItemTypes.EDIT_RELATION,
    item: () => {
      return { index, labelField: children, name };
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

  drag(drop(dragButtonRef));

  const getHeight = () => {
    const higherFields = ['json', 'text', 'file', 'media', 'component', 'richtext', 'dynamiczone'];

    if (attribute && higherFields.includes(attribute.type)) {
      return `${74 / 16}rem`;
    }

    return `${32 / 16}rem`;
  };

  return (
    <CustomFlex
      width="100%"
      borderColor="neutral150"
      hasRadius
      background="neutral100"
      minHeight={getHeight()}
      alignItems="stretch"
      isDragging={isDragging}
    >
      <DragButton
        as="span"
        type="button"
        ref={dragButtonRef}
        onClick={e => e.stopPropagation()}
        alignItems="center"
        paddingLeft={3}
        paddingRight={3}
        // Disable the keyboard navigation since the drag n drop isn't accessible with the keyboard for the moment
        tabIndex={-1}
      >
        <CustomDragIcon />
      </DragButton>
      <FieldButtonContent
        attribute={attribute}
        onEditField={onEditField}
        onDeleteField={onDeleteField}
      >
        {children}
      </FieldButtonContent>
    </CustomFlex>
  );
};

RelationalFieldButton.defaultProps = {
  attribute: undefined,
};

RelationalFieldButton.propTypes = {
  attribute: PropTypes.shape({
    components: PropTypes.array,
    component: PropTypes.string,
    type: PropTypes.string,
  }),
  onEditField: PropTypes.func.isRequired,
  onDeleteField: PropTypes.func.isRequired,
  children: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  onMoveField: PropTypes.func.isRequired,
};

export default RelationalFieldButton;
