/* eslint-disable import/no-cycle */
import React, { memo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { getEmptyImage } from 'react-dnd-html5-backend';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import toString from 'lodash/toString';
import get from 'lodash/get';

import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import {
  Accordion,
  AccordionToggle,
  AccordionContent,
  Grid,
  GridItem,
  Stack,
  Box,
  IconButton,
} from '@strapi/design-system';
import { Trash, Drag } from '@strapi/icons';

import { useDragAndDrop } from '../../../hooks/useDragAndDrop';

import { composeRefs, getTrad, ItemTypes } from '../../../utils';

import Inputs from '../../Inputs';
import FieldComponent from '../../FieldComponent';

import Preview from './Preview';

const CustomIconButton = styled(IconButton)`
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

const ActionsStack = styled(Stack)`
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

// Issues:
// https://github.com/react-dnd/react-dnd/issues/1368
// https://github.com/frontend-collective/react-sortable-tree/issues/490

const DraggedItem = ({
  componentFieldName,
  componentUid,
  fields,
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
}) => {
  const { modifiedData, removeRepeatableField, triggerFormValidation } = useCMEditViewDataManager();

  const displayedValue = toString(
    get(modifiedData, [...componentFieldName.split('.'), mainField], '')
  );
  const accordionRef = useRef(null);
  const { formatMessage } = useIntl();

  const [{ handlerId, isDragging, handleKeyDown }, boxRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(!isReadOnly, {
      type: ItemTypes.COMPONENT,
      index,
      item: {
        displayedValue,
      },
      onMoveItem: moveComponentField,
      onStart() {
        // Close all collapses
        toggleCollapses();
      },
      onEnd() {
        // Update the errors
        triggerFormValidation();
      },
      onGrabItem,
      onDropItem,
      onCancel,
    });

  useEffect(() => {
    dragPreviewRef(getEmptyImage(), { captureDraggingState: false });
  }, [dragPreviewRef]);

  const composedAccordionRefs = composeRefs(accordionRef, dragRef);
  const composedBoxRefs = composeRefs(boxRef, dropRef);

  return (
    <Box ref={composedBoxRefs}>
      {isDragging ? (
        <Preview ref={dragPreviewRef} />
      ) : (
        <Accordion expanded={isOpen} onToggle={onClickToggle} id={componentFieldName} size="S">
          <AccordionToggle
            action={
              isReadOnly ? null : (
                <ActionsStack horizontal spacing={0} expanded={isOpen}>
                  <CustomIconButton
                    expanded={isOpen}
                    noBorder
                    onClick={() => {
                      removeRepeatableField(componentFieldName);
                      toggleCollapses();
                    }}
                    label={formatMessage({
                      id: getTrad('containers.Edit.delete'),
                      defaultMessage: 'Delete',
                    })}
                    icon={<Trash />}
                  />
                  {/* react-dnd is broken in firefox with our IconButton, maybe a ref issue */}
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
                      id: getTrad('components.DragHandle-label'),
                      defaultMessage: 'Drag',
                    })}
                    onKeyDown={handleKeyDown}
                  >
                    <Drag />
                  </IconButton>
                </ActionsStack>
              )
            }
            title={displayedValue}
            togglePosition="left"
          />
          <AccordionContent>
            <Stack background="neutral100" padding={6} spacing={6}>
              {fields.map((fieldRow, key) => {
                return (
                  // eslint-disable-next-line react/no-array-index-key
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
                          />
                        </GridItem>
                      );
                    })}
                  </Grid>
                );
              })}
            </Stack>
          </AccordionContent>
        </Accordion>
      )}
    </Box>
  );
};

DraggedItem.defaultProps = {
  componentUid: undefined,
  fields: [],
  isReadOnly: false,
  isOpen: false,
  onGrabItem: undefined,
  onDropItem: undefined,
  onCancel: undefined,
  toggleCollapses() {},
};

DraggedItem.propTypes = {
  componentFieldName: PropTypes.string.isRequired,
  componentUid: PropTypes.string,
  fields: PropTypes.array,
  index: PropTypes.number.isRequired,
  isOpen: PropTypes.bool,
  isReadOnly: PropTypes.bool,
  mainField: PropTypes.string.isRequired,
  moveComponentField: PropTypes.func.isRequired,
  onGrabItem: PropTypes.func,
  onDropItem: PropTypes.func,
  onCancel: PropTypes.func,
  onClickToggle: PropTypes.func.isRequired,
  toggleCollapses: PropTypes.func,
};

export default memo(DraggedItem);
