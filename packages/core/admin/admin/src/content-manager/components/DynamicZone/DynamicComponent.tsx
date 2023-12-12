import * as React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionToggle,
  Box,
  Flex,
  IconButton,
  VisuallyHidden,
} from '@strapi/design-system';
import { Menu, MenuItem } from '@strapi/design-system/v2';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { Drag, More, Trash } from '@strapi/icons';
import get from 'lodash/get';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useContentTypeLayout } from '../../hooks/useContentTypeLayout';
import { type UseDragAndDropOptions, useDragAndDrop } from '../../hooks/useDragAndDrop';
import { ItemTypes } from '../../utils/dragAndDrop';
import { composeRefs } from '../../utils/refs';
import { getTranslation } from '../../utils/translations';
import { ComponentIcon } from '../ComponentIcon';
import { FieldComponent } from '../FieldComponent';

import type { ComponentPickerProps } from './ComponentPicker';

interface DynamicComponentProps
  extends Pick<UseDragAndDropOptions, 'onGrabItem' | 'onDropItem' | 'onCancel'>,
    Pick<ComponentPickerProps, 'dynamicComponentsByCategory'> {
  componentUid: string;
  formErrors?: Record<string, unknown>;
  index?: number;
  isFieldAllowed?: boolean;
  name: string;
  onAddComponent?: (componentUid: string, index: number) => void;
  onRemoveComponentClick: () => void;
  onMoveComponent: (dragIndex: number, hoverIndex: number) => void;
}

const DynamicComponent = ({
  componentUid,
  formErrors = {},
  index = 0,
  isFieldAllowed = false,
  name,
  onRemoveComponentClick,
  onMoveComponent,
  onGrabItem,
  onDropItem,
  onCancel,
  dynamicComponentsByCategory = {},
  onAddComponent,
}: DynamicComponentProps) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const { formatMessage } = useIntl();
  const { getComponentLayout } = useContentTypeLayout();
  const { modifiedData } = useCMEditViewDataManager();
  const { icon, friendlyName, mainValue } = React.useMemo(() => {
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
      id: getTranslation('components.DynamicZone.error-message'),
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
        index,
        displayedValue: `${friendlyName}${mainValue}`,
        icon,
      },
      onMoveItem: onMoveComponent,
      onDropItem,
      onGrabItem,
      onCancel,
    });

  React.useEffect(() => {
    dragPreviewRef(getEmptyImage(), { captureDraggingState: false });
  }, [dragPreviewRef, index]);

  const composedBoxRefs = composeRefs(boxRef, dropRef);

  const accordionActions = !isFieldAllowed ? null : (
    <ActionsFlex gap={0}>
      <IconButtonCustom
        noBorder
        label={formatMessage(
          {
            id: getTranslation('components.DynamicZone.delete-label'),
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
          id: getTranslation('components.DragHandle-label'),
          defaultMessage: 'Drag',
        })}
        onKeyDown={handleKeyDown}
      >
        <Drag />
      </IconButton>
      <Menu.Root>
        <Menu.Trigger size="S" endIcon={null} paddingLeft={2} paddingRight={2}>
          <More aria-hidden focusable={false} />
          <VisuallyHidden as="span">
            {formatMessage({
              id: getTranslation('components.DynamicZone.more-actions'),
              defaultMessage: 'More actions',
            })}
          </VisuallyHidden>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.SubRoot>
            <Menu.SubTrigger>
              {formatMessage({
                id: getTranslation('components.DynamicZone.add-item-above'),
                defaultMessage: 'Add component above',
              })}
            </Menu.SubTrigger>
            <Menu.SubContent>
              {Object.entries(dynamicComponentsByCategory).map(([category, components]) => (
                <React.Fragment key={category}>
                  <Menu.Label>{category}</Menu.Label>
                  {components.map(({ componentUid, info: { displayName } }) => (
                    <MenuItem
                      key={componentUid}
                      onSelect={() => onAddComponent?.(componentUid, index)}
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
                id: getTranslation('components.DynamicZone.add-item-below'),
                defaultMessage: 'Add component below',
              })}
            </Menu.SubTrigger>
            <Menu.SubContent>
              {Object.entries(dynamicComponentsByCategory).map(([category, components]) => (
                <React.Fragment key={category}>
                  <Menu.Label>{category}</Menu.Label>
                  {components.map(({ componentUid, info: { displayName } }) => (
                    <MenuItem
                      key={componentUid}
                      onSelect={() => onAddComponent?.(componentUid, index + 1)}
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
      {/* @ts-expect-error – Fix this ref issue */}
      <StyledBox ref={composedBoxRefs} hasRadius>
        {isDragging ? (
          <Preview />
        ) : (
          <Accordion expanded={isOpen} onToggle={handleToggle} size="S" error={errorMessage}>
            <AccordionToggle
              // @ts-expect-error – Issue in DS where AccordionToggle props don't extend TextButton
              startIcon={<ComponentIcon icon={icon} showBackground={false} size="S" />}
              action={accordionActions}
              title={`${friendlyName}${mainValue}`}
              togglePosition="left"
            />
            <AccordionContent>
              <AccordionContentRadius background="neutral0">
                <FieldComponent
                  componentUid={componentUid}
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

const IconButtonCustom = styled(IconButton)<{ expanded?: boolean }>`
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

export { DynamicComponent };
export type { DynamicComponentProps };
