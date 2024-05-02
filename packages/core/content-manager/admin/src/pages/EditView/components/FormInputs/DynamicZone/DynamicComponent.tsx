import * as React from 'react';

import { useForm } from '@strapi/admin/strapi-admin';
import {
  Accordion,
  AccordionContent,
  AccordionToggle,
  Box,
  Flex,
  Grid,
  GridItem,
  IconButton,
  VisuallyHidden,
  useComposedRefs,
} from '@strapi/design-system';
import { Menu, MenuItem } from '@strapi/design-system';
import { Drag, More, Trash } from '@strapi/icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { ComponentIcon } from '../../../../../components/ComponentIcon';
import { ItemTypes } from '../../../../../constants/dragAndDrop';
import { useDocLayout } from '../../../../../hooks/useDocumentLayout';
import { type UseDragAndDropOptions, useDragAndDrop } from '../../../../../hooks/useDragAndDrop';
import { getIn } from '../../../../../utils/objects';
import { getTranslation } from '../../../../../utils/translations';
import { InputRenderer } from '../../InputRenderer';

import type { ComponentPickerProps } from './ComponentPicker';

interface DynamicComponentProps
  extends Pick<UseDragAndDropOptions, 'onGrabItem' | 'onDropItem' | 'onCancel'>,
    Pick<ComponentPickerProps, 'dynamicComponentsByCategory'> {
  componentUid: string;
  disabled?: boolean;
  index: number;
  name: string;
  onAddComponent: (componentUid: string, index: number) => void;
  onRemoveComponentClick: () => void;
  onMoveComponent: (dragIndex: number, hoverIndex: number) => void;
}

const DynamicComponent = ({
  componentUid,
  disabled,
  index,
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
  const formValues = useForm('DynamicComponent', (state) => state.values);
  const {
    edit: { components },
  } = useDocLayout();

  const title = React.useMemo(() => {
    const { mainField } = components[componentUid]?.settings ?? { mainField: 'id' };

    const mainFieldValue = getIn(formValues, `${name}.${index}.${mainField}`);

    const displayedValue = mainField === 'id' ? '' : String(mainFieldValue).trim();

    const mainValue = displayedValue.length > 0 ? `- ${displayedValue}` : displayedValue;

    return mainValue;
  }, [componentUid, components, formValues, name, index]);

  const { icon, displayName } = React.useMemo(() => {
    const [category] = componentUid.split('.');
    const { icon, displayName } = (dynamicComponentsByCategory[category] ?? []).find(
      (component) => component.uid === componentUid
    ) ?? { icon: null, displayName: null };

    return { icon, displayName };
  }, [componentUid, dynamicComponentsByCategory]);

  // const fieldsErrors = Object.keys(formErrors).filter((errorKey) => {
  //   const errorKeysArray = errorKey.split('.');

  //   if (`${errorKeysArray[0]}.${errorKeysArray[1]}` === `${name}.${index}`) {
  //     return true;
  //   }

  //   return false;
  // });

  // let errorMessage;

  // if (fieldsErrors.length > 0) {
  //   errorMessage = formatMessage({
  //     id: getTranslation('components.DynamicZone.error-message'),
  //     defaultMessage: 'The component contains error(s)',
  //   });
  // }

  const handleToggle = () => {
    setIsOpen((s) => !s);
  };

  const [{ handlerId, isDragging, handleKeyDown }, boxRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(!disabled, {
      type: `${ItemTypes.DYNAMIC_ZONE}_${name}`,
      index,
      item: {
        index,
        displayedValue: `${displayName} ${title}`,
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

  const composedBoxRefs = useComposedRefs(boxRef, dropRef);

  const accordionActions = disabled ? null : (
    <ActionsFlex gap={0}>
      <IconButtonCustom
        borderWidth={0}
        label={formatMessage(
          {
            id: getTranslation('components.DynamicZone.delete-label'),
            defaultMessage: 'Delete {name}',
          },
          { name: title }
        )}
        onClick={onRemoveComponentClick}
      >
        <Trash />
      </IconButtonCustom>
      <IconButton
        forwardedAs="div"
        role="button"
        borderWidth={0}
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
                  {components.map(({ displayName, uid }) => (
                    <MenuItem key={componentUid} onSelect={() => onAddComponent(uid, index)}>
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
                  {components.map(({ displayName, uid }) => (
                    <MenuItem key={componentUid} onSelect={() => onAddComponent(uid, index + 1)}>
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
          <Accordion expanded={isOpen} onToggle={handleToggle} size="S" /*error={errorMessage}*/>
            <AccordionToggle
              // @ts-expect-error – Issue in DS where AccordionToggle props don't extend TextButton
              startIcon={<ComponentIcon icon={icon} showBackground={false} size="S" />}
              action={accordionActions}
              title={`${displayName} ${title}`}
              togglePosition="left"
            />
            <AccordionContent>
              <AccordionContentRadius background="neutral0">
                <Box paddingLeft={6} paddingRight={6} paddingTop={6} paddingBottom={6}>
                  {components[componentUid]?.layout?.map((row, rowInd) => (
                    <Grid gap={4} key={rowInd}>
                      {row.map(({ size, ...field }) => {
                        const fieldName = `${name}.${index}.${field.name}`;

                        return (
                          <GridItem col={size} key={fieldName} s={12} xs={12}>
                            <InputRenderer {...field} name={fieldName} />
                          </GridItem>
                        );
                      })}
                    </Grid>
                  ))}
                </Box>
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
