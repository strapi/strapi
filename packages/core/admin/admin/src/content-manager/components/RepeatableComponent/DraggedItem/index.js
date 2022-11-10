/* eslint-disable import/no-cycle */
import React, { memo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import toString from 'lodash/toString';

import { Accordion, AccordionToggle, AccordionContent } from '@strapi/design-system/Accordion';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import { Tooltip } from '@strapi/design-system/Tooltip';

import Trash from '@strapi/icons/Trash';
import Drag from '@strapi/icons/Drag';

import { composeRefs, getTrad, ItemTypes } from '../../../utils';

import Inputs from '../../Inputs';
import FieldComponent from '../../FieldComponent';

import Preview from './Preview';
import { CustomIconButton } from './IconButtonCustoms';
import { connect, select } from './utils';

const DragButton = styled.span`
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.spaces[7]};

  padding: 0 ${({ theme }) => theme.spaces[3]};
  cursor: all-scroll;

  svg {
    width: ${12 / 16}rem;
    height: ${12 / 16}rem;
  }
`;

/* eslint-disable react/no-array-index-key */

// Issues:
// https://github.com/react-dnd/react-dnd/issues/1368
// https://github.com/frontend-collective/react-sortable-tree/issues/490

const DraggedItem = ({
  componentFieldName,
  componentUid,
  // Errors are retrieved from the AccordionGroupCustom cloneElement
  hasErrorMessage,
  hasErrors,
  index,
  isOpen,
  isReadOnly,
  onClickToggle,
  schema,
  toggleCollapses,
  // Retrieved from the select function
  moveComponentField,
  removeRepeatableField,
  triggerFormValidation,
  displayedValue,
}) => {
  const accordionRef = useRef(null);
  const boxRef = useRef(null);
  const { formatMessage } = useIntl();

  const fields = schema.layouts.edit;

  const [{ handlerId }, dropRef] = useDrop({
    accept: ItemTypes.COMPONENT,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!boxRef.current) {
        return;
      }

      const dragIndex = item.index;
      const currentIndex = index;

      // Don't replace items with themselves
      if (dragIndex === currentIndex) {
        return;
      }

      const hoverBoundingRect = boxRef.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Dragging downwards
      if (dragIndex < currentIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > currentIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveComponentField(dragIndex, currentIndex);

      item.index = currentIndex;
    },
  });
  const [{ isDragging }, dragRef, previewRef] = useDrag({
    type: ItemTypes.COMPONENT,
    item() {
      // Close all collapses
      toggleCollapses(-1);

      return {
        index,
      };
    },
    end() {
      // Update the errors
      triggerFormValidation();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    previewRef(getEmptyImage(), { captureDraggingState: false });
  }, [previewRef]);

  const accordionTitle = toString(displayedValue);
  const accordionHasError = hasErrors ? 'error' : undefined;

  const composedAccordionRefs = composeRefs(accordionRef, dragRef);
  const composedBoxRefs = composeRefs(boxRef, dropRef);

  return (
    <Box ref={composedBoxRefs}>
      {isDragging ? (
        <Preview ref={previewRef} />
      ) : (
        <Accordion
          error={accordionHasError}
          hasErrorMessage={hasErrorMessage}
          expanded={isOpen}
          onToggle={onClickToggle}
          id={componentFieldName}
          size="S"
        >
          <AccordionToggle
            action={
              isReadOnly ? null : (
                <Stack horizontal spacing={0}>
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
                  <Tooltip
                    description={formatMessage({
                      id: getTrad('components.DragHandle-label'),
                      defaultMessage: 'Drag',
                    })}
                  >
                    <DragButton
                      role="button"
                      tabIndex={-1}
                      ref={composedAccordionRefs}
                      onClick={(e) => e.stopPropagation()}
                      data-handler-id={handlerId}
                    >
                      <Drag />
                    </DragButton>
                  </Tooltip>
                </Stack>
              )
            }
            title={accordionTitle}
            togglePosition="left"
          />
          <AccordionContent>
            <Stack background="neutral100" padding={6} spacing={6}>
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
                            // onBlur={hasErrors ? checkFormErrors : null}
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
  isOpen: false,
  toggleCollapses() {},
};

DraggedItem.propTypes = {
  componentFieldName: PropTypes.string.isRequired,
  componentUid: PropTypes.string,
  hasErrorMessage: PropTypes.bool.isRequired,
  hasErrors: PropTypes.bool.isRequired,
  index: PropTypes.number.isRequired,
  isOpen: PropTypes.bool,
  isReadOnly: PropTypes.bool.isRequired,
  onClickToggle: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
  toggleCollapses: PropTypes.func,
  moveComponentField: PropTypes.func.isRequired,
  removeRepeatableField: PropTypes.func.isRequired,
  triggerFormValidation: PropTypes.func.isRequired,
  displayedValue: PropTypes.string.isRequired,
};

const Memoized = memo(DraggedItem);

export default connect(Memoized, select);

export { DraggedItem };
