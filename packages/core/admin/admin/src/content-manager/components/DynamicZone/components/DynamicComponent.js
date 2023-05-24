import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import { getEmptyImage } from 'react-dnd-html5-backend';

import {
  Accordion,
  AccordionToggle,
  AccordionContent,
  IconButton,
  Box,
  Flex,
} from '@strapi/design-system';
import { Menu, MenuItem } from '@strapi/design-system/v2';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { Trash, Drag, More } from '@strapi/icons';

import { useContentTypeLayout, useDragAndDrop } from '../../../hooks';
import { composeRefs, getTrad, ItemTypes } from '../../../utils';

import FieldComponent from '../../FieldComponent';

export const DynamicComponent = ({
  componentUid,
  formErrors,
  index,
  isFieldAllowed,
  name,
  onRemoveComponentClick,
  onMoveComponent,
  onGrabItem,
  onDropItem,
  onCancel,
  dynamicComponentsByCategory,
  onAddComponent,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const { formatMessage } = useIntl();
  const { getComponentLayout } = useContentTypeLayout();
  const { modifiedData } = useCMEditViewDataManager();
  const { icon, friendlyName, mainValue } = useMemo(() => {
    const componentLayoutData = getComponentLayout(componentUid);

    const {
      info: { icon, displayName },
    } = componentLayoutData;

    const mainFieldKey = get(componentLayoutData, ['settings', 'mainField'], 'id');

    const mainField = get(modifiedData, [name, index, mainFieldKey]) ?? '';

    const displayedValue = mainFieldKey === 'id' ? '' : String(mainField).trim();

    const mainValue = displayedValue.length > 0 ? ` - ${displayedValue}` : displayedValue;

    return { friendlyName: displayName, icon, mainValue };
  }, [componentUid, getComponentLayout, modifiedData, name, index]);

  const fieldsErrors = Object.keys(formErrors).filter((errorKey) => {
    const errorKeysArray = errorKey.split('.');

    if (`${errorKeysArray[0]}.${errorKeysArray[1]}` === `${name}.${index}`) {
      return true;
    }

    return false;
  });

  let errorMessage;

  if (fieldsErrors.length > 0) {
    errorMessage = formatMessage({
      id: getTrad('components.DynamicZone.error-message'),
      defaultMessage: 'The component contains error(s)',
    });
  }

  const handleToggle = () => {
    setIsOpen((s) => !s);
  };

  const [{ handlerId, isDragging, handleKeyDown }, boxRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(isFieldAllowed, {
      type: `${ItemTypes.DYNAMIC_ZONE}_${name}`,
      index,
      item: {
        displayedValue: `${friendlyName}${mainValue}`,
        icon,
      },
      onMoveItem: onMoveComponent,
      onGrabItem,
      onDropItem,
      onCancel,
    });

  useEffect(() => {
    dragPreviewRef(getEmptyImage(), { captureDraggingState: false });
  }, [dragPreviewRef, index]);

  const composedBoxRefs = composeRefs(boxRef, dropRef);

  const accordionActions = !isFieldAllowed ? null : (
    <ActionsFlex gap={0} expanded={isOpen}>
      <IconButtonCustom
        noBorder
        label={formatMessage(
          {
            id: getTrad('components.DynamicZone.delete-label'),
            defaultMessage: 'Delete {name}',
          },
          { name: friendlyName }
        )}
        onClick={onRemoveComponentClick}
      >
        <Trash />
      </IconButtonCustom>
      <IconButton
        forwardedAs="div"
        role="button"
        noBorder
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        data-handler-id={handlerId}
        ref={dragRef}
        label={formatMessage({
          id: getTrad('components.DragHandle-label'),
          defaultMessage: 'Drag',
        })}
        onKeyDown={handleKeyDown}
      >
        <Drag />
      </IconButton>
      <Menu.Root>
        <Menu.Trigger size="S" endIcon={undefined} paddingLeft={2} paddingRight={2}>
          <More />
        </Menu.Trigger>
        <Menu.Content>
          <Menu.SubRoot>
            <Menu.SubTrigger>
              {formatMessage({
                id: getTrad('components.DynamicZone.add-item-above'),
                defaultMessage: 'Add item above',
              })}
            </Menu.SubTrigger>
            <Menu.SubContent>
              {Object.entries(dynamicComponentsByCategory).map(([category, components]) => (
                <React.Fragment key={category}>
                  <Menu.Label>{category}</Menu.Label>
                  {components.map(({ componentUid, info: { displayName } }) => (
                    <MenuItem
                      key={componentUid}
                      onSelect={() => onAddComponent(componentUid, index - 1)}
                    >
                      {displayName}
                    </MenuItem>
                  ))}
                </React.Fragment>
              ))}
            </Menu.SubContent>
          </Menu.SubRoot>
          <Menu.SubRoot>
            <Menu.SubTrigger>
              {formatMessage({
                id: getTrad('components.DynamicZone.add-item-below'),
                defaultMessage: 'Add item below',
              })}
            </Menu.SubTrigger>
            <Menu.SubContent>
              {Object.entries(dynamicComponentsByCategory).map(([category, components]) => (
                <React.Fragment key={category}>
                  <Menu.Label>{category}</Menu.Label>
                  {components.map(({ componentUid, info: { displayName } }) => (
                    <MenuItem
                      key={componentUid}
                      onSelect={() => onAddComponent(componentUid, index + 1)}
                    >
                      {displayName}
                    </MenuItem>
                  ))}
                </React.Fragment>
              ))}
            </Menu.SubContent>
          </Menu.SubRoot>
        </Menu.Content>
      </Menu.Root>
    </ActionsFlex>
  );

  return (
    <ComponentContainer as="li" width="100%">
      <Flex justifyContent="center">
        <Rectangle background="neutral200" />
      </Flex>
      <StyledBox ref={composedBoxRefs} hasRadius>
        {isDragging ? (
          <Preview padding={6} background="primary100" />
        ) : (
          <Accordion expanded={isOpen} onToggle={handleToggle} size="S" error={errorMessage}>
            <AccordionToggle
              action={accordionActions}
              title={`${friendlyName}${mainValue}`}
              togglePosition="left"
            />
            <AccordionContent>
              <AccordionContentRadius background="neutral0">
                <FieldComponent
                  componentUid={componentUid}
                  icon={icon}
                  name={`${name}.${index}`}
                  isFromDynamicZone
                />
              </AccordionContentRadius>
            </AccordionContent>
          </Accordion>
        )}
      </StyledBox>
    </ComponentContainer>
  );
};

const ActionsFlex = styled(Flex)`
  /* 
    we need to remove the background from the button but we can't 
    wrap the element in styled because it breaks the forwardedAs which
    we need for drag handler to work on firefox
  */
  div[role='button'] {
    background: transparent;
  }
`;

const IconButtonCustom = styled(IconButton)`
  background-color: transparent;

  svg path {
    fill: ${({ theme, expanded }) =>
      expanded ? theme.colors.primary600 : theme.colors.neutral600};
  }
`;

// TODO: Delete once https://github.com/strapi/design-system/pull/858
// is merged and released.
const StyledBox = styled(Box)`
  > div:first-child {
    box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  }
`;

const AccordionContentRadius = styled(Box)`
  border-radius: 0 0 ${({ theme }) => theme.spaces[1]} ${({ theme }) => theme.spaces[1]};
`;

const Rectangle = styled(Box)`
  width: ${({ theme }) => theme.spaces[2]};
  height: ${({ theme }) => theme.spaces[4]};
`;

const Preview = styled.span`
  display: block;
  background-color: ${({ theme }) => theme.colors.primary100};
  outline: 1px dashed ${({ theme }) => theme.colors.primary500};
  outline-offset: -1px;
  padding: ${({ theme }) => theme.spaces[6]};
`;

const ComponentContainer = styled(Box)`
  list-style: none;
  padding: 0;
  margin: 0;
`;

DynamicComponent.defaultProps = {
  dynamicComponentsByCategory: {},
  formErrors: {},
  index: 0,
  isFieldAllowed: true,
  onAddComponent: undefined,
  onGrabItem: undefined,
  onDropItem: undefined,
  onCancel: undefined,
};

DynamicComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  dynamicComponentsByCategory: PropTypes.shape({
    components: PropTypes.arrayOf(
      PropTypes.shape({
        componentUid: PropTypes.string.isRequired,
        info: PropTypes.object,
      })
    ),
  }),
  formErrors: PropTypes.object,
  index: PropTypes.number,
  isFieldAllowed: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onAddComponent: PropTypes.func,
  onGrabItem: PropTypes.func,
  onDropItem: PropTypes.func,
  onCancel: PropTypes.func,
  onMoveComponent: PropTypes.func.isRequired,
  onRemoveComponentClick: PropTypes.func.isRequired,
};
