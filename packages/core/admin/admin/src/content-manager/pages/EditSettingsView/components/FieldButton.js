import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useDrop, useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { IconButton } from '@strapi/design-system/IconButton';
import { Typography } from '@strapi/design-system/Typography';
import Drag from '@strapi/icons/Drag';
import Pencil from '@strapi/icons/Pencil';
import Trash from '@strapi/icons/Trash';
import { getTrad } from '../../../utils';
import ComponentFieldList from './ComponentFieldList';
import DynamicZoneList from './DynamicZoneList';

const CustomIconButton = styled(IconButton)`
  background-color: transparent;
  path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;
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

const FieldButton = ({
  attribute,
  onEditField,
  onDeleteField,
  children,
  index,
  itemType,
  name,
  onMoveField,
}) => {
  const dragButtonRef = useRef();

  const [, drop] = useDrop({
    accept: itemType,
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

      console.log(hoverIndex);

      onMoveField(dragIndex, hoverIndex);

      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: itemType,
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

  const { formatMessage } = useIntl();
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
        as="button"
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
      <Box overflow="hidden" width="100%">
        <Flex paddingLeft={3} alignItems="baseline" justifyContent="space-between">
          <Box>
            <Typography fontWeight="bold" textColor="neutral800">
              {children}
            </Typography>
          </Box>
          <Flex>
            <CustomIconButton
              label={formatMessage(
                {
                  id: getTrad('containers.ListSettingsView.modal-form.edit-label'),
                  defaultMessage: `Edit {fieldName}`,
                },
                { fieldName: children }
              )}
              onClick={onEditField}
              icon={<Pencil />}
              noBorder
            />
            <CustomIconButton
              label={formatMessage(
                {
                  id: getTrad('app.component.table.delete'),
                  defaultMessage: `Delete {target}`,
                },
                {
                  target: children,
                }
              )}
              data-testid="delete-field"
              onClick={onDeleteField}
              icon={<Trash />}
              noBorder
            />
          </Flex>
        </Flex>
        {attribute?.type === 'component' && (
          <ComponentFieldList componentUid={attribute.component} />
        )}
        {attribute?.type === 'dynamiczone' && <DynamicZoneList components={attribute.components} />}
      </Box>
    </CustomFlex>
  );
};

FieldButton.defaultProps = {
  attribute: undefined,
};

FieldButton.propTypes = {
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
  itemType: PropTypes.string.isRequired,
  onMoveField: PropTypes.func.isRequired,
};

export default FieldButton;
