import * as React from 'react';

import { useForm, useField } from '@strapi/admin/strapi-admin';
import {
  Accordion,
  Box,
  Flex,
  Grid,
  IconButton,
  VisuallyHidden,
  useComposedRefs,
  Menu,
  MenuItem,
  BoxComponent,
} from '@strapi/design-system';
import { Drag, More, Trash } from '@strapi/icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { COMPONENT_ICONS } from '../../../../../components/ComponentIcon';
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
  const { formatMessage } = useIntl();
  const formValues = useForm('DynamicComponent', (state) => state.values);
  const {
    edit: { components },
  } = useDocLayout();

  const title = React.useMemo(() => {
    const { mainField } = components[componentUid]?.settings ?? { mainField: 'id' };

    const mainFieldValue = getIn(formValues, `${name}.${index}.${mainField}`);

    const displayedValue =
      mainField === 'id' || !mainFieldValue ? '' : String(mainFieldValue).trim();

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

  /**
   * We don't need the accordion's to communicate with each other,
   * so a unique value for their state is enough.
   */
  const accordionValue = React.useId();

  const { value = [], rawError } = useField(`${name}.${index}`);

  const [collapseToOpen, setCollapseToOpen] = React.useState<string>('');

  React.useEffect(() => {
    if (rawError && value) {
      setCollapseToOpen(accordionValue);
    }
  }, [rawError, value, accordionValue]);

  const composedBoxRefs = useComposedRefs(boxRef, dropRef);

  const accordionActions = disabled ? null : (
    <>
      <IconButton
        variant="ghost"
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
      </IconButton>
      <IconButton
        variant="ghost"
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
          <VisuallyHidden tag="span">
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
    </>
  );

  const accordionTitle = title ? `${displayName} ${title}` : displayName;

  return (
    <ComponentContainer tag="li" width="100%">
      <Flex justifyContent="center">
        <Rectangle background="neutral200" />
      </Flex>
      <StyledBox ref={composedBoxRefs} hasRadius>
        {isDragging ? (
          <Preview />
        ) : (
          <Accordion.Root value={collapseToOpen} onValueChange={setCollapseToOpen}>
            <Accordion.Item value={accordionValue}>
              <Accordion.Header>
                <Accordion.Trigger
                  icon={
                    icon && COMPONENT_ICONS[icon]
                      ? COMPONENT_ICONS[icon]
                      : COMPONENT_ICONS.dashboard
                  }
                >
                  {accordionTitle}
                </Accordion.Trigger>
                <Accordion.Actions>{accordionActions}</Accordion.Actions>
              </Accordion.Header>
              <Accordion.Content>
                <AccordionContentRadius background="neutral0">
                  <Box paddingLeft={6} paddingRight={6} paddingTop={6} paddingBottom={6}>
                    <Grid.Root gap={4}>
                      {components[componentUid]?.layout?.map((row, rowInd) => (
                        <Grid.Item
                          col={12}
                          key={rowInd}
                          s={12}
                          xs={12}
                          direction="column"
                          alignItems="stretch"
                        >
                          <Grid.Root gap={4}>
                            {row.map(({ size, ...field }) => {
                              const fieldName = `${name}.${index}.${field.name}`;

                              return (
                                <Grid.Item
                                  col={size}
                                  key={fieldName}
                                  s={12}
                                  xs={12}
                                  direction="column"
                                  alignItems="stretch"
                                >
                                  <InputRenderer {...field} name={fieldName} />
                                </Grid.Item>
                              );
                            })}
                          </Grid.Root>
                        </Grid.Item>
                      ))}
                    </Grid.Root>
                  </Box>
                </AccordionContentRadius>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        )}
      </StyledBox>
    </ComponentContainer>
  );
};

// TODO: Delete once https://github.com/strapi/design-system/pull/858
// is merged and released.
const StyledBox = styled<BoxComponent>(Box)`
  > div:first-child {
    box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  }
`;

const AccordionContentRadius = styled<BoxComponent>(Box)`
  border-radius: 0 0 ${({ theme }) => theme.spaces[1]} ${({ theme }) => theme.spaces[1]};
`;

const Rectangle = styled<BoxComponent>(Box)`
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

const ComponentContainer = styled<BoxComponent<'li'>>(Box)`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export { DynamicComponent };
export type { DynamicComponentProps };
