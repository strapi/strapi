import * as React from 'react';

import { useField, useNotification, useForm, useIsDesktop } from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  TextButton,
  VisuallyHidden,
  Accordion,
  IconButton,
  useComposedRefs,
  BoxComponent,
} from '@strapi/design-system';
import { Plus, Drag, Trash, ArrowUp, ArrowDown } from '@strapi/icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { styled } from 'styled-components';

import { ItemTypes } from '../../../../../constants/dragAndDrop';
import { useDocumentContext } from '../../../../../hooks/useDocumentContext';
import { useDragAndDrop, type UseDragAndDropOptions } from '../../../../../hooks/useDragAndDrop';
import { usePrev } from '../../../../../hooks/usePrev';
import { getIn } from '../../../../../utils/objects';
import { getTranslation } from '../../../../../utils/translations';
import { transformDocument } from '../../../utils/data';
import { createDefaultForm } from '../../../utils/forms';
import { ResponsiveGridItem, ResponsiveGridRoot } from '../../FormLayout';
import { ComponentProvider, useComponent } from '../ComponentContext';

import { Initializer } from './Initializer';

import type { ComponentInputProps } from './Input';
import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * RepeatableComponent
 * -----------------------------------------------------------------------------------------------*/

type RepeatableComponentProps = Omit<ComponentInputProps, 'required' | 'label'>;

const RepeatableComponent = ({
  attribute,
  disabled,
  name,
  mainField,
  children,
  layout,
}: RepeatableComponentProps) => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const { search: searchString } = useLocation();
  const search = React.useMemo(() => new URLSearchParams(searchString), [searchString]);
  const { currentDocument } = useDocumentContext('RepeatableComponent');
  const components = currentDocument.components;

  const {
    value = [],
    error,
    rawError,
  } = useField<Schema.Attribute.ComponentValue<`${string}.${string}`, true>>(name);
  const addFieldRow = useForm('RepeatableComponent', (state) => state.addFieldRow);
  const moveFieldRow = useForm('RepeatableComponent', (state) => state.moveFieldRow);
  const removeFieldRow = useForm('RepeatableComponent', (state) => state.removeFieldRow);
  const { max = Infinity } = attribute;

  const [collapseToOpen, setCollapseToOpen] = React.useState<string>('');
  const [liveText, setLiveText] = React.useState('');

  React.useEffect(() => {
    const hasNestedErrors = rawError && Array.isArray(rawError) && rawError.length > 0;
    const hasNestedValue = value && Array.isArray(value) && value.length > 0;

    if (hasNestedErrors && hasNestedValue) {
      const errorOpenItems = rawError
        .map((_: unknown, idx: number) => {
          return value[idx] ? value[idx].__temp_key__ : null;
        })
        .filter((value) => !!value);

      if (errorOpenItems && errorOpenItems.length > 0) {
        setCollapseToOpen((collapseToOpen) => {
          if (!errorOpenItems.includes(collapseToOpen)) {
            return errorOpenItems[0];
          }

          return collapseToOpen;
        });
      }
    }
  }, [rawError, value]);

  /**
   * Get the temp key of the component that has the field that is currently focussed
   * as defined by the `field` query param. We can then force this specific component
   * to be in its "open" state.
   */
  const componentTmpKeyWithFocussedField = React.useMemo(() => {
    if (search.has('field')) {
      const fieldParam = search.get('field');

      if (!fieldParam) {
        return undefined;
      }

      const [, path] = fieldParam.split(`${name}.`);

      if (getIn(value, path, undefined) !== undefined) {
        const [subpath] = path.split('.');

        return getIn(value, subpath, undefined)?.__temp_key__;
      }
    }

    return undefined;
  }, [search, name, value]);

  const prevValue = usePrev(value);

  React.useEffect(() => {
    /**
     * When we add a new item to the array, we want to open the collapse.
     */
    if (prevValue && prevValue.length < value.length) {
      setCollapseToOpen(value[value.length - 1].__temp_key__);
    }
  }, [value, prevValue]);

  React.useEffect(() => {
    if (typeof componentTmpKeyWithFocussedField === 'string') {
      setCollapseToOpen(componentTmpKeyWithFocussedField);
    }
  }, [componentTmpKeyWithFocussedField]);

  const toggleCollapses = React.useCallback(() => {
    setCollapseToOpen('');
  }, []);

  const handleClick = () => {
    if (value.length < max) {
      const schema = components[attribute.component];
      const form = createDefaultForm(schema, components);
      const data = transformDocument(schema, components)(form);

      addFieldRow(name, data);
      // setCollapseToOpen(nextTempKey);
    } else if (value.length >= max) {
      toggleNotification({
        type: 'info',
        message: formatMessage({
          id: getTranslation('components.notification.info.maximum-requirement'),
        }),
      });
    }
  };

  const handleMoveComponentField = React.useCallback(
    (newIndex: number, currentIndex: number) => {
      setLiveText(
        formatMessage(
          {
            id: getTranslation('dnd.reorder'),
            defaultMessage: '{item}, moved. New position in list: {position}.',
          },
          {
            item: `${name}.${currentIndex}`,
            position: `${newIndex + 1} of ${value.length}`,
          }
        )
      );

      moveFieldRow(name, currentIndex, newIndex);
    },
    [formatMessage, moveFieldRow, name, value.length]
  );

  const handleValueChange = (key: string) => {
    setCollapseToOpen(key);
  };

  const handleCancel = React.useCallback(
    (index: number) => {
      setLiveText(
        formatMessage(
          {
            id: getTranslation('dnd.cancel-item'),
            defaultMessage: '{item}, dropped. Re-order cancelled.',
          },
          {
            item: `${name}.${index}`,
          }
        )
      );
    },
    [formatMessage, name]
  );

  const handleGrabItem = React.useCallback(
    (index: number) => {
      setLiveText(
        formatMessage(
          {
            id: getTranslation('dnd.grab-item'),
            defaultMessage: `{item}, grabbed. Current position in list: {position}. Press up and down arrow to change position, Spacebar to drop, Escape to cancel.`,
          },
          {
            item: `${name}.${index}`,
            position: `${index + 1} of ${value.length}`,
          }
        )
      );
    },
    [formatMessage, name, value.length]
  );

  const handleDropItem = React.useCallback(
    (index: number) => {
      setLiveText(
        formatMessage(
          {
            id: getTranslation('dnd.drop-item'),
            defaultMessage: `{item}, dropped. Final position in list: {position}.`,
          },
          {
            item: `${name}.${index}`,
            position: `${index + 1} of ${value.length}`,
          }
        )
      );
    },
    [formatMessage, name, value.length]
  );

  const handleDeleteComponent = React.useCallback(
    (index: number) => {
      removeFieldRow(name, index);
      toggleCollapses();
    },
    [name, removeFieldRow, toggleCollapses]
  );

  const ariaDescriptionId = React.useId();

  const level = useComponent('RepeatableComponent', (state) => state.level);

  if (value.length === 0) {
    return <Initializer disabled={disabled} name={name} onClick={handleClick} />;
  }

  return (
    <Box hasRadius>
      <VisuallyHidden id={ariaDescriptionId}>
        {formatMessage({
          id: getTranslation('dnd.instructions'),
          defaultMessage: `Press spacebar to grab and re-order`,
        })}
      </VisuallyHidden>
      <VisuallyHidden aria-live="assertive">{liveText}</VisuallyHidden>
      <AccordionRoot
        $error={error}
        value={collapseToOpen}
        onValueChange={handleValueChange}
        aria-describedby={ariaDescriptionId}
      >
        {value.map((componentValue, index) => {
          const key = componentValue.__temp_key__;
          const id = componentValue.id;
          const nameWithIndex = `${name}.${index}`;

          return (
            <ComponentProvider
              key={key}
              // id is always a number in a component
              id={id as number}
              uid={attribute.component}
              level={level + 1}
              type="repeatable"
            >
              <MemoizedComponent
                disabled={disabled}
                name={nameWithIndex}
                attributeComponent={attribute.component}
                index={index}
                mainField={mainField}
                onMoveItem={handleMoveComponentField}
                onDeleteComponent={handleDeleteComponent}
                toggleCollapses={toggleCollapses}
                onCancel={handleCancel}
                onDropItem={handleDropItem}
                onGrabItem={handleGrabItem}
                __temp_key__={key}
                totalLength={value.length}
                layout={layout}
                renderField={children}
              />
            </ComponentProvider>
          );
        })}
        <TextButtonCustom disabled={disabled} onClick={handleClick} startIcon={<Plus />}>
          {formatMessage({
            id: getTranslation('containers.EditView.add.new-entry'),
            defaultMessage: 'Add an entry',
          })}
        </TextButtonCustom>
      </AccordionRoot>
    </Box>
  );
};

const AccordionRoot = styled(Accordion.Root)<{ $error?: string }>`
  border: 1px solid
    ${({ theme, $error }) => ($error ? theme.colors.danger600 : theme.colors.neutral200)};
`;

const TextButtonCustom = styled(TextButton)`
  width: 100%;
  display: flex;
  justify-content: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral200};
  padding-inline: ${(props) => props.theme.spaces[6]};
  padding-block: ${(props) => props.theme.spaces[3]};

  &:not([disabled]) {
    cursor: pointer;

    &:hover {
      background-color: ${(props) => props.theme.colors.primary100};
    }
  }

  span {
    font-weight: 600;
    font-size: 1.4rem;
    line-height: 2.4rem;
  }

  @media (prefers-reduced-motion: no-preference) {
    transition: background-color 120ms ${(props) => props.theme.motion.easings.easeOutQuad};
  }
`;

interface RepeatableComponentFieldsProps
  extends Pick<RepeatableComponentProps, 'children' | 'layout'> {
  attributeComponent: string;
  nameWithIndex: string;
}

const RepeatableComponentFields = React.memo(
  ({ attributeComponent, children, layout, nameWithIndex }: RepeatableComponentFieldsProps) => {
    const { formatMessage } = useIntl();

    return (
      <>
        {layout.map((row, index) => {
          return (
            <ResponsiveGridRoot gap={4} key={index}>
              {row.map(({ size, ...field }) => {
                /**
                 * Layouts are built from schemas so they don't understand the complete
                 * schema tree, for components we append the parent name to the field name
                 * because this is the structure for the data & permissions also understand
                 * the nesting involved.
                 */
                const completeFieldName = `${nameWithIndex}.${field.name}`;

                const translatedLabel = formatMessage({
                  id: `content-manager.components.${attributeComponent}.${field.name}`,
                  defaultMessage: field.label,
                });

                return (
                  <ResponsiveGridItem
                    col={size}
                    key={completeFieldName}
                    s={12}
                    xs={12}
                    direction="column"
                    alignItems="stretch"
                  >
                    {children({
                      ...field,
                      label: translatedLabel,
                      name: completeFieldName,
                    })}
                  </ResponsiveGridItem>
                );
              })}
            </ResponsiveGridRoot>
          );
        })}
      </>
    );
  }
);

RepeatableComponentFields.displayName = 'RepeatableComponentFields';

/* -------------------------------------------------------------------------------------------------
 * Field
 * -----------------------------------------------------------------------------------------------*/

interface ComponentProps
  extends Pick<UseDragAndDropOptions, 'onGrabItem' | 'onDropItem' | 'onCancel' | 'onMoveItem'>,
    Pick<RepeatableComponentProps, 'mainField' | 'layout'> {
  attributeComponent: string;
  disabled?: boolean;
  index: number;
  name: string;
  onDeleteComponent?: (index: number) => void;
  renderField: RepeatableComponentProps['children'];
  toggleCollapses: () => void;
  __temp_key__: string;
  totalLength: number;
}

const Component = ({
  attributeComponent,
  disabled,
  index,
  name,
  mainField = {
    name: 'id',
    type: 'integer',
  },
  layout,
  onDeleteComponent,
  renderField,
  toggleCollapses,
  __temp_key__,
  totalLength,
  onMoveItem,
  ...dragProps
}: ComponentProps) => {
  const { formatMessage } = useIntl();
  const isDesktop = useIsDesktop();

  const displayValue = useForm('RepeatableComponent', (state) => {
    return getIn(state.values, [...name.split('.'), mainField.name]);
  });

  const accordionRef = React.useRef<HTMLButtonElement>(null!);

  /**
   * The last item in the fieldName array will be the index of this component.
   * Drag and drop should be isolated to the parent component so nested repeatable
   * components are not affected by the drag and drop of the parent component in
   * their own re-ordering context.
   */
  const componentKey = name.split('.').slice(0, -1).join('.');

  const [{ handlerId, isDragging, handleKeyDown }, boxRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(!disabled, {
      type: `${ItemTypes.COMPONENT}_${componentKey}`,
      index,
      item: {
        index,
        displayedValue: displayValue,
      },
      onStart() {
        // Close all collapses
        toggleCollapses();
      },
      onMoveItem,
      ...dragProps,
    });

  React.useEffect(() => {
    dragPreviewRef(getEmptyImage(), { captureDraggingState: false });
  }, [dragPreviewRef, index]);

  const composedAccordionRefs = useComposedRefs<HTMLButtonElement>(accordionRef, dragRef);
  const composedBoxRefs = useComposedRefs<HTMLDivElement>(
    boxRef as React.RefObject<HTMLDivElement>,
    dropRef
  );

  const canMoveUp = index > 0;
  const canMoveDown = index < totalLength - 1;
  const handleDeleteClick = () => {
    onDeleteComponent?.(index);
  };

  return (
    <>
      {isDragging ? (
        <Preview />
      ) : (
        <Accordion.Item ref={composedBoxRefs} value={__temp_key__}>
          <Accordion.Header>
            <Accordion.Trigger>{displayValue}</Accordion.Trigger>
            <Accordion.Actions>
              <IconButton
                disabled={disabled}
                variant="ghost"
                onClick={handleDeleteClick}
                label={formatMessage({
                  id: getTranslation('containers.Edit.delete'),
                  defaultMessage: 'Delete',
                })}
              >
                <Trash />
              </IconButton>
              {isDesktop && (
                <IconButton
                  disabled={disabled}
                  ref={composedAccordionRefs}
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  data-handler-id={handlerId}
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
                      disabled={disabled || !canMoveUp}
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMoveItem) {
                          onMoveItem(index - 1, index);
                        }
                      }}
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
                      disabled={disabled || !canMoveDown}
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMoveItem) {
                          onMoveItem(index + 1, index);
                        }
                      }}
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
            </Accordion.Actions>
          </Accordion.Header>
          <Accordion.Content>
            <Flex
              direction="column"
              alignItems="stretch"
              background="neutral100"
              padding={{ initial: 4, medium: 6 }}
              gap={{ initial: 3, medium: 4 }}
            >
              <RepeatableComponentFields
                attributeComponent={attributeComponent}
                layout={layout}
                nameWithIndex={name}
              >
                {renderField}
              </RepeatableComponentFields>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      )}
    </>
  );
};

const Preview = () => {
  return <StyledSpan tag="span" padding={6} background="primary100" />;
};

const StyledSpan = styled<BoxComponent<'span'>>(Box)`
  display: block;
  outline: 1px dashed ${({ theme }) => theme.colors.primary500};
  outline-offset: -1px;
`;

const MemoizedComponent = React.memo(Component);
const MemoizedRepeatableComponent = React.memo(RepeatableComponent);

export { MemoizedRepeatableComponent as RepeatableComponent };
export type { RepeatableComponentProps };
