import * as React from 'react';

import { useField, useNotification, useForm } from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  TextButton,
  VisuallyHidden,
  Accordion,
  IconButton,
  useComposedRefs,
  Grid,
  BoxComponent,
} from '@strapi/design-system';
import { Plus, Drag, Trash } from '@strapi/icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { styled } from 'styled-components';

import { ItemTypes } from '../../../../../constants/dragAndDrop';
import { useDoc } from '../../../../../hooks/useDocument';
import { useDragAndDrop, type UseDragAndDropOptions } from '../../../../../hooks/useDragAndDrop';
import { usePrev } from '../../../../../hooks/usePrev';
import { getIn } from '../../../../../utils/objects';
import { getTranslation } from '../../../../../utils/translations';
import { transformDocument } from '../../../utils/data';
import { createDefaultForm } from '../../../utils/forms';
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
  const { components } = useDoc();

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

  const toggleCollapses = () => {
    setCollapseToOpen('');
  };

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

  const handleMoveComponentField: ComponentProps['onMoveItem'] = (newIndex, currentIndex) => {
    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.reorder'),
          defaultMessage: '{item}, moved. New position in list: {position}.',
        },
        {
          item: `${name}.${currentIndex}`,
          position: getItemPos(newIndex),
        }
      )
    );

    moveFieldRow(name, currentIndex, newIndex);
  };

  const handleValueChange = (key: string) => {
    setCollapseToOpen(key);
  };

  const getItemPos = (index: number) => `${index + 1} of ${value.length}`;

  const handleCancel = (index: number) => {
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
  };

  const handleGrabItem = (index: number) => {
    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.grab-item'),
          defaultMessage: `{item}, grabbed. Current position in list: {position}. Press up and down arrow to change position, Spacebar to drop, Escape to cancel.`,
        },
        {
          item: `${name}.${index}`,
          position: getItemPos(index),
        }
      )
    );
  };

  const handleDropItem = (index: number) => {
    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.drop-item'),
          defaultMessage: `{item}, dropped. Final position in list: {position}.`,
        },
        {
          item: `${name}.${index}`,
          position: getItemPos(index),
        }
      )
    );
  };

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
        {value.map(({ __temp_key__: key, id }, index) => {
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
              <Component
                disabled={disabled}
                name={nameWithIndex}
                attribute={attribute}
                index={index}
                mainField={mainField}
                onMoveItem={handleMoveComponentField}
                onDeleteComponent={() => {
                  removeFieldRow(name, index);
                  toggleCollapses();
                }}
                toggleCollapses={toggleCollapses}
                onCancel={handleCancel}
                onDropItem={handleDropItem}
                onGrabItem={handleGrabItem}
                __temp_key__={key}
              >
                {layout.map((row, index) => {
                  return (
                    <Grid.Root gap={4} key={index}>
                      {row.map(({ size, ...field }) => {
                        /**
                         * Layouts are built from schemas so they don't understand the complete
                         * schema tree, for components we append the parent name to the field name
                         * because this is the structure for the data & permissions also understand
                         * the nesting involved.
                         */
                        const completeFieldName = `${nameWithIndex}.${field.name}`;

                        return (
                          <Grid.Item
                            col={size}
                            key={completeFieldName}
                            s={12}
                            xs={12}
                            direction="column"
                            alignItems="stretch"
                          >
                            {children({ ...field, name: completeFieldName })}
                          </Grid.Item>
                        );
                      })}
                    </Grid.Root>
                  );
                })}
              </Component>
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

/* -------------------------------------------------------------------------------------------------
 * Field
 * -----------------------------------------------------------------------------------------------*/

interface ComponentProps
  extends Pick<UseDragAndDropOptions, 'onGrabItem' | 'onDropItem' | 'onCancel' | 'onMoveItem'>,
    Pick<RepeatableComponentProps, 'mainField'> {
  attribute: Schema.Attribute.Component<`${string}.${string}`, boolean>;
  disabled?: boolean;
  index: number;
  name: string;
  onDeleteComponent?: React.MouseEventHandler<HTMLButtonElement>;
  toggleCollapses: () => void;
  children: React.ReactNode;
  __temp_key__: string;
}

const Component = ({
  disabled,
  index,
  name,
  mainField = {
    name: 'id',
    type: 'integer',
  },
  children,
  onDeleteComponent,
  toggleCollapses,
  __temp_key__,
  ...dragProps
}: ComponentProps) => {
  const { formatMessage } = useIntl();

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
                variant="ghost"
                onClick={onDeleteComponent}
                label={formatMessage({
                  id: getTranslation('containers.Edit.delete'),
                  defaultMessage: 'Delete',
                })}
              >
                <Trash />
              </IconButton>
              <IconButton
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
            </Accordion.Actions>
          </Accordion.Header>
          <Accordion.Content>
            <Flex
              direction="column"
              alignItems="stretch"
              background="neutral100"
              padding={6}
              gap={6}
            >
              {children}
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

export { RepeatableComponent };
export type { RepeatableComponentProps };
