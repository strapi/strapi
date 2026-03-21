import * as React from 'react';

import { useForm, useIsDesktop } from '@strapi/admin/strapi-admin';
import {
  Accordion,
  Box,
  Flex,
  Grid,
  IconButton,
  useComposedRefs,
  Menu,
  BoxComponent,
} from '@strapi/design-system';
import { Drag, More, Trash, ArrowUp, ArrowDown } from '@strapi/icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { COMPONENT_ICONS } from '../../../../../components/ComponentIcon';
import { ItemTypes } from '../../../../../constants/dragAndDrop';
import { useDocumentContext } from '../../../../../hooks/useDocumentContext';
import { type EditFieldLayout, useDocumentLayout } from '../../../../../hooks/useDocumentLayout';
import { type UseDragAndDropOptions, useDragAndDrop } from '../../../../../hooks/useDragAndDrop';
import { getIn } from '../../../../../utils/objects';
import { getTranslation } from '../../../../../utils/translations';
import { ResponsiveGridItem, ResponsiveGridRoot } from '../../FormLayout';
import { InputRenderer, type InputRendererProps } from '../../InputRenderer';

import type { ComponentPickerProps } from './ComponentPicker';

interface DynamicComponentProps
  extends Pick<UseDragAndDropOptions, 'onGrabItem' | 'onDropItem' | 'onCancel'>,
    Pick<ComponentPickerProps, 'dynamicComponentsByCategory'> {
  componentUid: string;
  disabled?: boolean;
  index: number;
  name: string;
  onAddComponent: (componentUid: string, index: number) => void;
  onRemoveComponentClick: (index: number) => void;
  onMoveComponent: (dragIndex: number, hoverIndex: number) => void;
  totalLength: number;
  children?: (props: InputRendererProps) => React.ReactNode;
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
  totalLength,
  children,
}: DynamicComponentProps) => {
  const { formatMessage } = useIntl();
  const { currentDocumentMeta } = useDocumentContext('DynamicComponent');
  const isDesktop = useIsDesktop();

  const {
    edit: { components },
  } = useDocumentLayout(currentDocumentMeta.model);

  const { mainField = 'id' } = components[componentUid]?.settings ?? {};

  const mainFieldValue = useForm('DynamicComponent', (state) =>
    getIn(state.values, `${name}.${index}.${mainField}`)
  );

  const displayedValue = mainField === 'id' || !mainFieldValue ? '' : String(mainFieldValue).trim();
  const displayTitle = displayedValue.length > 0 ? `- ${displayedValue}` : displayedValue;

  const [category] = componentUid.split('.');
  const { icon, displayName } = (dynamicComponentsByCategory[category] ?? []).find(
    (component) => component.uid === componentUid
  ) ?? { icon: null, displayName: null };

  const [{ handlerId, isDragging, handleKeyDown }, boxRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(!disabled, {
      type: `${ItemTypes.DYNAMIC_ZONE}_${name}`,
      index,
      item: {
        index,
        displayedValue: `${displayName} ${displayTitle}`,
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

  const componentPath = `${name}.${index}`;
  const hasValue = useForm(
    'DynamicComponent',
    (state) => getIn(state.values, componentPath) != null
  );
  const isNewItem = useForm(
    'DynamicComponent',
    (state) => getIn(state.values, componentPath)?.id == null
  );
  const rawError = useForm('DynamicComponent', (state) => getIn(state.errors, componentPath));

  const [collapseToOpen, setCollapseToOpen] = React.useState<string>(
    isNewItem ? accordionValue : ''
  );

  React.useEffect(() => {
    if (rawError && hasValue) {
      setCollapseToOpen(accordionValue);
    }
  }, [rawError, hasValue, accordionValue]);

  const composedBoxRefs = useComposedRefs(boxRef, dropRef);

  const canMoveUp = index > 0;
  const canMoveDown = index < totalLength - 1;
  const handleRemoveCurrentComponent = React.useCallback(() => {
    onRemoveComponentClick(index);
  }, [onRemoveComponentClick, index]);

  const accordionActions = disabled ? null : (
    <>
      <IconButton
        variant="ghost"
        label={formatMessage(
          {
            id: getTranslation('components.DynamicZone.delete-label'),
            defaultMessage: 'Delete {name}',
          },
          { name: displayTitle }
        )}
        onClick={handleRemoveCurrentComponent}
      >
        <Trash />
      </IconButton>
      {isDesktop && (
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
      )}
      {!isDesktop && (
        <>
          {canMoveUp && (
            <IconButton
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onMoveComponent(index - 1, index);
              }}
              disabled={!canMoveUp}
              label={formatMessage({
                id: getTranslation('components.DynamicZone.move-up'),
                defaultMessage: 'Move up',
              })}
            >
              <ArrowUp />
            </IconButton>
          )}
          {canMoveDown && (
            <IconButton
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onMoveComponent(index + 1, index);
              }}
              disabled={!canMoveDown}
              label={formatMessage({
                id: getTranslation('components.DynamicZone.move-down'),
                defaultMessage: 'Move down',
              })}
            >
              <ArrowDown />
            </IconButton>
          )}
        </>
      )}
      <Menu.Root>
        <Menu.Trigger size="S" endIcon={null} paddingLeft={0} paddingRight={0}>
          <IconButton
            variant="ghost"
            label={formatMessage({
              id: getTranslation('components.DynamicZone.more-actions'),
              defaultMessage: 'More actions',
            })}
            tag="span"
          >
            <More aria-hidden focusable={false} />
          </IconButton>
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
                    <Menu.Item key={uid} onSelect={() => onAddComponent(uid, index)}>
                      {displayName}
                    </Menu.Item>
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
                    <Menu.Item key={uid} onSelect={() => onAddComponent(uid, index + 1)}>
                      {displayName}
                    </Menu.Item>
                  ))}
                </React.Fragment>
              ))}
            </Menu.SubContent>
          </Menu.SubRoot>
        </Menu.Content>
      </Menu.Root>
    </>
  );

  const accordionTitle = displayTitle ? `${displayName} ${displayTitle}` : displayName;

  return (
    <ComponentContainer tag="li" width="100%">
      <Flex justifyContent="center">
        <Rectangle />
      </Flex>
      <StyledBox ref={composedBoxRefs} hasRadius>
        {isDragging ? (
          <Preview />
        ) : (
          <Accordion.Root value={collapseToOpen} onValueChange={setCollapseToOpen}>
            <Accordion.Item value={accordionValue}>
              <Accordion.Header variant={index % 2 === 0 ? 'primary' : 'secondary'}>
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
                <AccordionContentRadius>
                  <DynamicComponentFields
                    componentUid={componentUid}
                    index={index}
                    layout={components[componentUid]?.layout}
                    name={name}
                  >
                    {children}
                  </DynamicComponentFields>
                </AccordionContentRadius>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        )}
      </StyledBox>
    </ComponentContainer>
  );
};

const StyledBox = styled<BoxComponent>(Box)`
  width: 100%;
  min-width: 0;

  > div:first-child {
    box-shadow: ${({ theme }) => theme.shadows.tableShadow};
    background-color: ${({ theme }) => theme.colors.neutral0};
    color: ${({ theme }) => theme.colors.neutral800};
  }
`;

const AccordionContentRadius = styled<BoxComponent>(Box)`
  border-radius: 0 0 ${({ theme }) => theme.spaces[1]} ${({ theme }) => theme.spaces[1]};
  background-color: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral800};
`;

const Rectangle = styled<BoxComponent>(Box)`
  width: ${({ theme }) => theme.spaces[2]};
  height: ${({ theme }) => theme.spaces[4]};
  background-color: ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.spaces[1]};
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
  width: 100%;
  min-width: 0;
`;

interface DynamicComponentFieldsProps extends Pick<DynamicComponentProps, 'children'> {
  componentUid: string;
  index: number;
  layout?: EditFieldLayout[][];
  name: string;
}

const DynamicComponentFields = React.memo(
  ({ children, componentUid, index, layout, name }: DynamicComponentFieldsProps) => {
    const { formatMessage } = useIntl();

    return (
      <Box padding={{ initial: 4, medium: 6 }}>
        <Grid.Root gap={4}>
          {layout?.map((row, rowInd) => {
            return (
              <Grid.Item col={12} key={rowInd} xs={12} direction="column" alignItems="stretch">
                <ResponsiveGridRoot gap={4}>
                  {row.map(({ size, ...field }) => {
                    const fieldName = `${name}.${index}.${field.name}`;

                    const fieldWithTranslatedLabel = {
                      ...field,
                      label: formatMessage({
                        id: `content-manager.components.${componentUid}.${field.name}`,
                        defaultMessage: field.label,
                      }),
                    };

                    return (
                      <ResponsiveGridItem
                        col={size}
                        key={fieldName}
                        s={12}
                        xs={12}
                        direction="column"
                        alignItems="stretch"
                      >
                        {children ? (
                          children({
                            ...fieldWithTranslatedLabel,
                            name: fieldName,
                          })
                        ) : (
                          <InputRenderer {...fieldWithTranslatedLabel} name={fieldName} />
                        )}
                      </ResponsiveGridItem>
                    );
                  })}
                </ResponsiveGridRoot>
              </Grid.Item>
            );
          })}
        </Grid.Root>
      </Box>
    );
  }
);

DynamicComponentFields.displayName = 'DynamicComponentFields';

const MemoizedDynamicComponent = React.memo(DynamicComponent);

export { MemoizedDynamicComponent as DynamicComponent };
export type { DynamicComponentProps };
