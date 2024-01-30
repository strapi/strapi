import * as React from 'react';

import {
  Box,
  Flex,
  TextButton,
  VisuallyHidden,
  Accordion,
  AccordionContent as DSAccordionContent,
  AccordionToggle,
  Grid,
  GridItem,
  IconButton,
  Typography,
  KeyboardNavigable,
} from '@strapi/design-system';
import {
  TranslationMessage,
  useCMEditViewDataManager,
  useNotification,
  useQuery,
} from '@strapi/helper-plugin';
import { Plus, Drag, Trash } from '@strapi/icons';
import get from 'lodash/get';
import toString from 'lodash/toString';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useContentTypeLayout } from '../hooks/useContentTypeLayout';
import { useDragAndDrop, type UseDragAndDropOptions } from '../hooks/useDragAndDrop';
import { useLazyComponents } from '../hooks/useLazyComponents';
import { ItemTypes } from '../utils/dragAndDrop';
import { getMaxTempKey } from '../utils/fields';
import { composeRefs } from '../utils/refs';
import { getTranslation } from '../utils/translations';

import { ComponentInitializer } from './ComponentInitializer';
import { FieldComponent } from './FieldComponent';
import { Inputs } from './Inputs';

import type { EditLayoutRow } from '../utils/layouts';

/* -------------------------------------------------------------------------------------------------
 * RepeatableComponent
 * -----------------------------------------------------------------------------------------------*/

interface RepeatableComponentProps {
  componentUid: string;
  componentValue?: Array<{ __temp_key__: number }>;
  componentValueLength?: number;
  isReadOnly?: boolean;
  max?: number;
  min?: number;
  name: string;
}

const RepeatableComponent = ({
  componentUid,
  componentValue = [],
  componentValueLength = 0,
  isReadOnly,
  max = Infinity,
  min = -Infinity,
  name,
}: RepeatableComponentProps) => {
  const { addRepeatableComponentToField, formErrors, moveComponentField } =
    useCMEditViewDataManager();
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const [collapseToOpen, setCollapseToOpen] = React.useState<number | null>(null);
  const [liveText, setLiveText] = React.useState('');
  const { getComponentLayout, components } = useContentTypeLayout();
  const componentLayoutData = getComponentLayout(componentUid);

  const search = useQuery();

  /**
   * Get the temp key of the component that has the field that is currently focussed
   * as defined by the `field` query param. We can then force this specific component
   * to be in it's "open" state.
   */
  const componentTmpKeyWithFocussedField = React.useMemo(() => {
    if (search.has('field')) {
      const field = search.get('field');

      if (!field) {
        return undefined;
      }

      const [, path] = field.split(`${name}.`);

      if (get(componentValue, path, undefined) !== undefined) {
        const [subpath] = path.split('.');

        return componentValue[parseInt(subpath, 10)]?.__temp_key__;
      }
    }

    return undefined;
  }, [componentValue, search, name]);

  React.useEffect(() => {
    if (typeof componentTmpKeyWithFocussedField === 'number') {
      setCollapseToOpen(componentTmpKeyWithFocussedField);
    }
  }, [componentTmpKeyWithFocussedField]);

  const nextTempKey = getMaxTempKey(componentValue) + 1;

  const componentErrorKeys = getComponentErrorKeys(name, formErrors);

  const missingComponentsValue = min - componentValueLength;

  const hasMinError = formErrors[name]?.id?.includes('min') ?? false;

  const toggleCollapses = () => {
    setCollapseToOpen(null);
  };

  const handleClick = () => {
    if (!isReadOnly) {
      if (componentValueLength < max) {
        const shouldCheckErrors = hasMinError;

        addRepeatableComponentToField?.(name, componentLayoutData, components, shouldCheckErrors);

        setCollapseToOpen(nextTempKey);
      } else if (componentValueLength >= max) {
        toggleNotification({
          type: 'info',
          message: { id: getTranslation('components.notification.info.maximum-requirement') },
        });
      }
    }
  };

  const handleMoveComponentField: ComponentProps['moveComponentField'] = (
    newIndex,
    currentIndex
  ) => {
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

    moveComponentField?.({
      name,
      newIndex,
      currentIndex,
    });
  };

  const mainField =
    'settings' in componentLayoutData ? componentLayoutData.settings.mainField ?? 'id' : 'id';

  const handleToggle = (key: number) => () => {
    if (collapseToOpen === key) {
      setCollapseToOpen(null);
    } else {
      setCollapseToOpen(key);
    }
  };

  const getItemPos = (index: number) => `${index + 1} of ${componentValueLength}`;

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

  let errorMessage = formErrors[name];

  if (hasMinError) {
    errorMessage = {
      id: getTranslation('components.DynamicZone.missing-components'),
      defaultMessage:
        'There {number, plural, =0 {are # missing components} one {is # missing component} other {are # missing components}}',
      values: { number: missingComponentsValue },
    };
  } else if (componentErrorKeys.some((error) => error.split('.').length > 1) && !hasMinError) {
    errorMessage = {
      id: getTranslation('components.RepeatableComponent.error-message'),
      defaultMessage: 'The component(s) contain error(s)',
    };
  }

  if (componentValueLength === 0) {
    return (
      <ComponentInitializer error={errorMessage} isReadOnly={isReadOnly} onClick={handleClick} />
    );
  }

  const ariaDescriptionId = `${name}-item-instructions`;

  return (
    <Box hasRadius>
      <VisuallyHidden id={ariaDescriptionId}>
        {formatMessage({
          id: getTranslation('dnd.instructions'),
          defaultMessage: `Press spacebar to grab and re-order`,
        })}
      </VisuallyHidden>
      <VisuallyHidden aria-live="assertive">{liveText}</VisuallyHidden>
      <AccordionGroup error={errorMessage}>
        <AccordionContent aria-describedby={ariaDescriptionId}>
          {componentValue.map(({ __temp_key__: key }, index) => (
            <Component
              componentFieldName={`${name}.${index}`}
              componentUid={componentUid}
              fields={componentLayoutData.layouts.edit}
              key={key}
              index={index}
              isOpen={collapseToOpen === key}
              isReadOnly={isReadOnly}
              mainField={mainField}
              moveComponentField={handleMoveComponentField}
              onClickToggle={handleToggle(key)}
              toggleCollapses={toggleCollapses}
              onCancel={handleCancel}
              onDropItem={handleDropItem}
              onGrabItem={handleGrabItem}
            />
          ))}
        </AccordionContent>
        <AccordionFooter>
          <Flex justifyContent="center" height="48px" background="neutral0">
            <TextButtonCustom disabled={isReadOnly} onClick={handleClick} startIcon={<Plus />}>
              {formatMessage({
                id: getTranslation('containers.EditView.add.new-entry'),
                defaultMessage: 'Add an entry',
              })}
            </TextButtonCustom>
          </Flex>
        </AccordionFooter>
      </AccordionGroup>
    </Box>
  );
};

const TextButtonCustom = styled(TextButton)`
  height: 100%;
  width: 100%;
  border-radius: 0 0 4px 4px;
  display: flex;
  justify-content: center;
  span {
    font-weight: 600;
    font-size: 14px;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * Accordion
 * -----------------------------------------------------------------------------------------------*/

const AccordionFooter = styled(Box)`
  overflow: hidden;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-left: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: 0 0 ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius};
`;

const AccordionContent = styled(Box)`
  border-bottom: none;

  /* add the borders and make sure the top is transparent to avoid jumping with the hover effect  */
  & > div > div {
    border: 1px solid ${({ theme }) => theme.colors.neutral200};
    border-top-color: transparent;
  }

  /* the top accordion _does_ need a border though */
  & > div:first-child > div {
    border-top: 1px solid ${({ theme }) => theme.colors.neutral200};
  }

  /* Reset all the border-radius' */
  & > div > div,
  & > div > div > div {
    border-radius: unset;
  }

  /* Give the border radius back to the first accordion */
  & > div:first-child > div,
  & > div:first-child > div > div {
    border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
  }

  & > div > div[data-strapi-expanded='true'] {
    border: 1px solid ${({ theme }) => theme.colors.primary600};
  }
`;

interface AccordionGroupProps {
  children: React.ReactNode;
  error?: TranslationMessage;
}

const AccordionGroup = ({ children, error }: AccordionGroupProps) => {
  const { formatMessage } = useIntl();

  return (
    <KeyboardNavigable attributeName="data-strapi-accordion-toggle">
      {children}
      {error && (
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="danger600">
            {formatMessage(
              { id: error.id, defaultMessage: error.defaultMessage },
              { ...error.values }
            )}
          </Typography>
        </Box>
      )}
    </KeyboardNavigable>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Field
 * -----------------------------------------------------------------------------------------------*/

const CustomIconButton = styled(IconButton)<{ expanded?: boolean }>`
  background-color: transparent;

  svg {
    path {
      fill: ${({ theme, expanded }) =>
        expanded ? theme.colors.primary600 : theme.colors.neutral600};
    }
  }

  &:hover {
    svg {
      path {
        fill: ${({ theme }) => theme.colors.primary600};
      }
    }
  }
`;

const ActionsFlex = styled(Flex)<{ expanded?: boolean }>`
  & .drag-handle {
    background: unset;

    svg {
      path {
        fill: ${({ theme, expanded }) => (expanded ? theme.colors.primary600 : undefined)};
      }
    }

    &:hover {
      svg {
        path {
          /* keeps the hover style of the accordion */
          fill: ${({ theme }) => theme.colors.primary600};
        }
      }
    }
  }
`;

interface ComponentProps
  extends Pick<UseDragAndDropOptions, 'onGrabItem' | 'onDropItem' | 'onCancel'> {
  componentFieldName: string;
  componentUid: string;
  fields?: EditLayoutRow[][];
  index: number;
  isOpen?: boolean;
  isReadOnly?: boolean;
  mainField: string;
  onClickToggle: () => void;
  toggleCollapses: () => void;
  moveComponentField: (newIndex: number, currentIndex: number) => void;
}

const Component = ({
  componentFieldName,
  componentUid,
  fields = [],
  index,
  isOpen,
  isReadOnly,
  mainField,
  moveComponentField,
  onClickToggle,
  toggleCollapses,
  onGrabItem,
  onDropItem,
  onCancel,
}: ComponentProps) => {
  // @ts-expect-error – we need to add `triggerFormValidation` to the context.
  const { modifiedData, removeRepeatableField, triggerFormValidation } = useCMEditViewDataManager();

  const displayedValue = toString(
    get(modifiedData, [...componentFieldName.split('.'), mainField], '')
  );
  const accordionRef = React.useRef<HTMLButtonElement>(null!);
  const { formatMessage } = useIntl();

  /**
   * The last item in the fieldName array will be the index of this component.
   * Drag and drop should be isolated to the parent component so nested repeatable
   * components are not affected by the drag and drop of the parent component in
   * their own re-ordering context.
   */
  const componentKey = componentFieldName.split('.').slice(0, -1).join('.');

  const [{ handlerId, isDragging, handleKeyDown }, boxRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(!isReadOnly, {
      type: `${ItemTypes.COMPONENT}_${componentKey}`,
      index,
      item: {
        index,
        displayedValue,
      },
      onStart() {
        // Close all collapses
        toggleCollapses();
      },
      onEnd() {
        // Update the errors
        triggerFormValidation();
      },
      onMoveItem: moveComponentField,
      onDropItem,
      onGrabItem,
      onCancel,
    });

  React.useEffect(() => {
    dragPreviewRef(getEmptyImage(), { captureDraggingState: false });
  }, [dragPreviewRef, index]);

  const composedAccordionRefs = composeRefs<HTMLButtonElement>(accordionRef, dragRef);
  const composedBoxRefs = composeRefs(boxRef, dropRef);

  const { lazyComponentStore } = useLazyComponents();

  return (
    <Box ref={(ref) => composedBoxRefs(ref!)}>
      {isDragging ? (
        <Preview />
      ) : (
        <Accordion expanded={isOpen} onToggle={onClickToggle} id={componentFieldName} size="S">
          <AccordionToggle
            action={
              isReadOnly ? null : (
                <ActionsFlex gap={0} expanded={isOpen}>
                  <CustomIconButton
                    expanded={isOpen}
                    noBorder
                    onClick={() => {
                      removeRepeatableField?.(componentFieldName);
                      toggleCollapses();
                    }}
                    label={formatMessage({
                      id: getTranslation('containers.Edit.delete'),
                      defaultMessage: 'Delete',
                    })}
                    icon={<Trash />}
                  />
                  <IconButton
                    className="drag-handle"
                    ref={composedAccordionRefs}
                    forwardedAs="div"
                    role="button"
                    noBorder
                    tabIndex={0}
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
                </ActionsFlex>
              )
            }
            title={displayedValue}
            togglePosition="left"
          />
          <DSAccordionContent>
            <Flex
              direction="column"
              alignItems="stretch"
              background="neutral100"
              padding={6}
              gap={6}
            >
              {fields.map((fieldRow, key) => {
                return (
                  <Grid gap={4} key={key}>
                    {fieldRow.map(({ name, fieldSchema, metadatas, queryInfos, size }) => {
                      const isComponent = fieldSchema.type === 'component';
                      const keys = `${componentFieldName}.${name}`;

                      if (isComponent) {
                        const componentUid = fieldSchema.component;

                        return (
                          <GridItem col={size} s={12} xs={12} key={name}>
                            <FieldComponent
                              componentUid={componentUid}
                              intlLabel={{
                                id: metadatas.label,
                                defaultMessage: metadatas.label,
                              }}
                              isRepeatable={fieldSchema.repeatable}
                              isNested
                              name={keys}
                              max={fieldSchema.max}
                              min={fieldSchema.min}
                              required={fieldSchema.required}
                            />
                          </GridItem>
                        );
                      }

                      return (
                        <GridItem key={keys} col={size} s={12} xs={12}>
                          <Inputs
                            componentUid={componentUid}
                            fieldSchema={fieldSchema}
                            keys={keys}
                            metadatas={metadatas}
                            queryInfos={queryInfos}
                            size={size}
                            customFieldInputs={lazyComponentStore}
                          />
                        </GridItem>
                      );
                    })}
                  </Grid>
                );
              })}
            </Flex>
          </DSAccordionContent>
        </Accordion>
      )}
    </Box>
  );
};

const Preview = () => {
  return <StyledSpan as="span" padding={6} background="primary100" />;
};

const StyledSpan = styled(Box)`
  display: block;
  outline: 1px dashed ${({ theme }) => theme.colors.primary500};
  outline-offset: -1px;
`;

function getComponentErrorKeys(name: string, formErrors = {}) {
  return Object.keys(formErrors)
    .filter((errorKey) => errorKey.startsWith(name))
    .map((errorKey) =>
      errorKey
        .split('.')
        .slice(0, name.split('.').length + 1)
        .join('.')
    );
}

export { RepeatableComponent };
export type { RepeatableComponentProps };
