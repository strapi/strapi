/* eslint-disable import/no-cycle */
import React, { memo, useEffect, useRef, useState } from 'react';
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
import ItemTypes from '../../../utils/ItemTypes';
import getTrad from '../../../utils/getTrad';
import Inputs from '../../Inputs';
import FieldComponent from '../../FieldComponent';
import Preview from './Preview';
import DraggingSibling from './DraggingSibling';
import { CustomIconButton } from './IconButtonCustoms';
import { connect, select } from './utils';
import DynamicZone from '../../DynamicZone';

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
  // Errors are retrieved from the AccordionGroupCustom cloneElement
  hasErrorMessage,
  hasErrors,
  isDraggingSibling,
  isOpen,
  isReadOnly,
  onClickToggle,
  schema,
  toggleCollapses,
  // Retrieved from the select function
  moveComponentField,
  removeRepeatableField,
  setIsDraggingSibling,
  triggerFormValidation,
  // checkFormErrors,
  displayedValue,
}) => {
  const dragRef = useRef(null);
  const dropRef = useRef(null);
  const [, forceRerenderAfterDnd] = useState(false);
  const { formatMessage } = useIntl();

  const fields = schema.layouts.edit;

  const [, drop] = useDrop({
    accept: ItemTypes.COMPONENT,
    canDrop() {
      return false;
    },
    hover(item, monitor) {
      if (!dropRef.current) {
        return;
      }

      const dragPath = item.originalPath;
      const hoverPath = componentFieldName;
      const fullPathToComponentArray = dragPath.split('.');
      const dragIndexString = fullPathToComponentArray
        .slice()
        .splice(-1)
        .join('');
      const hoverIndexString = hoverPath
        .split('.')
        .splice(-1)
        .join('');
      const pathToComponentArray = fullPathToComponentArray.slice(
        0,
        fullPathToComponentArray.length - 1
      );
      const dragIndex = parseInt(dragIndexString, 10);
      const hoverIndex = parseInt(hoverIndexString, 10);

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = dropRef.current.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      // If They are not in the same level, should not move
      if (dragPath.split('.').length !== hoverPath.split('.').length) {
        return;
      }
      // Time to actually perform the action in the data
      moveComponentField(pathToComponentArray, dragIndex, hoverIndex);

      item.originalPath = hoverPath;
    },
  });
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.COMPONENT,
    item: () => {
      // Close all collapses
      toggleCollapses(-1);

      return {
        displayedValue,
        originalPath: componentFieldName,
      };
    },
    end: () => {
      // Update the errors
      triggerFormValidation();
      setIsDraggingSibling(false);
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: false });
  }, [preview]);

  useEffect(() => {
    if (isDragging) {
      setIsDraggingSibling(true);
    }
  }, [isDragging, setIsDraggingSibling]);

  // Effect in order to force a rerender after reordering the components
  // Since we are removing the Accordion when doing the DnD  we are losing the dragRef, therefore the replaced element cannot be dragged
  // anymore, this hack forces a rerender in order to apply the dragRef
  useEffect(() => {
    if (!isDraggingSibling) {
      forceRerenderAfterDnd(prev => !prev);
    }
  }, [isDraggingSibling]);

  // Create the refs
  // We need 1 for the drop target
  // 1 for the drag target
  const refs = {
    dragRef: drag(dragRef),
    dropRef: drop(dropRef),
  };

  const accordionTitle = toString(displayedValue);
  const accordionHasError = hasErrors ? 'error' : undefined;

  return (
    <Box ref={refs ? refs.dropRef : null}>
      {isDragging && <Preview />}
      {!isDragging && isDraggingSibling && (
        <DraggingSibling displayedValue={accordionTitle} componentFieldName={componentFieldName} />
      )}

      {!isDragging && !isDraggingSibling && (
        <Accordion
          error={accordionHasError}
          hasErrorMessage={hasErrorMessage}
          expanded={isOpen}
          toggle={onClickToggle}
          id={componentFieldName}
          size="S"
        >
          <AccordionToggle
            action={
              isReadOnly ? null : (
                <Stack horizontal size={0}>
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
                      ref={refs.dragRef}
                      onClick={e => e.stopPropagation()}
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
            <Stack background="neutral100" padding={6} size={6}>
              {fields.map((fieldRow, key) => {
                return (
                  <Grid gap={4} key={key}>
                    {fieldRow.map(({ name, fieldSchema, metadatas, queryInfos, size }) => {
                      const isComponent = fieldSchema.type === 'component';
                      const isDynamicZone = fieldSchema.type === 'dynamiczone';
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
                      if (isDynamicZone) {
                        return (
                          <GridItem col={size} s={12} xs={12} key={name}>
                            <DynamicZone
                              name={keys}
                              fieldSchema={fieldSchema}
                              metadatas={metadatas}
                            />
                          </GridItem>
                        );
                      }
                      
return (
  <GridItem key={keys} col={size} s={12} xs={12}>
    <Inputs
      fieldSchema={fieldSchema}
      keys={keys}
      metadatas={metadatas}
                            // onBlur={hasErrors ? checkFormErrors : null}
      queryInfos={queryInfos}
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
  isDraggingSibling: false,
  isOpen: false,
  setIsDraggingSibling: () => {},
  toggleCollapses: () => {},
};

DraggedItem.propTypes = {
  componentFieldName: PropTypes.string.isRequired,
  hasErrorMessage: PropTypes.bool.isRequired,
  hasErrors: PropTypes.bool.isRequired,
  isDraggingSibling: PropTypes.bool,
  isOpen: PropTypes.bool,
  isReadOnly: PropTypes.bool.isRequired,
  onClickToggle: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
  toggleCollapses: PropTypes.func,
  moveComponentField: PropTypes.func.isRequired,
  removeRepeatableField: PropTypes.func.isRequired,
  setIsDraggingSibling: PropTypes.func,
  triggerFormValidation: PropTypes.func.isRequired,
  // checkFormErrors: PropTypes.func.isRequired,
  displayedValue: PropTypes.string.isRequired,
};

const Memoized = memo(DraggedItem);

export default connect(Memoized, select);

export { DraggedItem };
