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
import { useNotification, useQuery } from '@strapi/helper-plugin';
import { Plus, Drag, Trash } from '@strapi/icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useField, useForm } from '../../../../../../components/Form';
import { getIn } from '../../../../../../utils/object';
import { useComposedRefs } from '../../../../../../utils/refs';
import { ItemTypes } from '../../../../../constants/dragAndDrop';
import { useDoc } from '../../../../../hooks/useDocument';
import { useDocLayout } from '../../../../../hooks/useDocumentLayout';
import { useDragAndDrop, type UseDragAndDropOptions } from '../../../../../hooks/useDragAndDrop';
import { getTranslation } from '../../../../../utils/translations';
import { transformDocument } from '../../../utils/data';
import { createDefaultForm } from '../../../utils/forms';
import { InputRenderer } from '../../InputRenderer';

import { Initializer } from './Initializer';

import type { ComponentInputProps } from './Input';
import type { Attribute } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * RepeatableComponent
 * -----------------------------------------------------------------------------------------------*/

interface RepeatableComponentProps extends Omit<ComponentInputProps, 'label' | 'required'> {}

const RepeatableComponent = ({
  attribute,
  disabled,
  name,
  mainField,
}: RepeatableComponentProps) => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { components } = useDoc();

  const { value = [], error } =
    useField<Attribute.ComponentValue<`${string}.${string}`, true>>(name);
  const addFieldRow = useForm('RepeatableComponent', (state) => state.addFieldRow);
  const moveFieldRow = useForm('RepeatableComponent', (state) => state.moveFieldRow);
  const removeFieldRow = useForm('RepeatableComponent', (state) => state.removeFieldRow);
  const { max = Infinity } = attribute;

  const [collapseToOpen, setCollapseToOpen] = React.useState<number | null>(null);
  const [liveText, setLiveText] = React.useState('');

  const search = useQuery();

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

  React.useEffect(() => {
    if (typeof componentTmpKeyWithFocussedField === 'number') {
      setCollapseToOpen(componentTmpKeyWithFocussedField);
    }
  }, [componentTmpKeyWithFocussedField]);

  const toggleCollapses = () => {
    setCollapseToOpen(null);
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
        message: { id: getTranslation('components.notification.info.maximum-requirement') },
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

  const handleToggle = (key: number) => () => {
    if (collapseToOpen === key) {
      setCollapseToOpen(null);
    } else {
      setCollapseToOpen(key);
    }
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
      <AccordionGroup error={error}>
        <AccordionContent aria-describedby={ariaDescriptionId}>
          {value.map(({ __temp_key__: key }, index) => (
            <Component
              key={key}
              disabled={disabled}
              name={`${name}.${index}`}
              attribute={attribute}
              index={index}
              isOpen={collapseToOpen === key}
              mainField={mainField}
              onMoveItem={handleMoveComponentField}
              onClickToggle={handleToggle(key)}
              onDeleteComponent={() => {
                removeFieldRow(name, index);
                toggleCollapses();
              }}
              toggleCollapses={toggleCollapses}
              onCancel={handleCancel}
              onDropItem={handleDropItem}
              onGrabItem={handleGrabItem}
            />
          ))}
        </AccordionContent>
        <AccordionFooter>
          <Flex justifyContent="center" height="48px" background="neutral0">
            <TextButtonCustom disabled={disabled} onClick={handleClick} startIcon={<Plus />}>
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
  error?: string;
}

const AccordionGroup = ({ children, error }: AccordionGroupProps) => {
  return (
    <KeyboardNavigable attributeName="data-strapi-accordion-toggle">
      {children}
      {error && (
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="danger600">
            {error}
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
  extends Pick<UseDragAndDropOptions, 'onGrabItem' | 'onDropItem' | 'onCancel' | 'onMoveItem'> {
  attribute: Attribute.Component<`${string}.${string}`, boolean>;
  disabled?: boolean;
  index: number;
  isOpen?: boolean;
  name: string;
  mainField?: string;
  onClickToggle: () => void;
  onDeleteComponent?: React.MouseEventHandler<HTMLButtonElement>;
  toggleCollapses: () => void;
}

const Component = ({
  attribute,
  disabled,
  index,
  isOpen,
  name,
  mainField = 'id',
  onClickToggle,
  onDeleteComponent,
  toggleCollapses,
  ...dragProps
}: ComponentProps) => {
  const { formatMessage } = useIntl();
  const {
    edit: { components },
  } = useDocLayout();

  const { layout } = components[attribute.component];

  const displayValue = useForm('RepeatableComponent', (state) => {
    return getIn(state.values, [...name.split('.'), mainField]);
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
  const composedBoxRefs = useComposedRefs(boxRef, dropRef);

  return (
    <Box ref={(ref) => composedBoxRefs(ref!)}>
      {isDragging ? (
        <Preview />
      ) : (
        <Accordion expanded={isOpen} onToggle={onClickToggle} id={name} size="S">
          <AccordionToggle
            action={
              disabled ? null : (
                <ActionsFlex gap={0} expanded={isOpen}>
                  <CustomIconButton
                    expanded={isOpen}
                    borderWidth={0}
                    onClick={onDeleteComponent}
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
                    borderWidth={0}
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
            title={displayValue}
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
              {layout.map((row, index) => {
                return (
                  <Grid gap={4} key={index}>
                    {row.map(({ size, ...field }) => {
                      /**
                       * Layouts are built from schemas so they don't understand the complete
                       * schema tree, for components we append the parent name to the field name
                       * because this is the structure for the data & permissions also understand
                       * the nesting involved.
                       */
                      const completeFieldName = `${name}.${field.name}`;

                      return (
                        <GridItem col={size} key={completeFieldName} s={12} xs={12}>
                          <InputRenderer {...field} name={completeFieldName} />
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

export { RepeatableComponent };
export type { RepeatableComponentProps };
