/* eslint-disable import/no-cycle */
import React, { memo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import toString from 'lodash/toString';
import styled from 'styled-components';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/parts/Accordion';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { IconButton } from '@strapi/parts/IconButton';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Stack } from '@strapi/parts/Stack';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import DragHandle from '@strapi/icons/Drag';
import ItemTypes from '../../../utils/ItemTypes';
import getTrad from '../../../utils/getTrad';
import Inputs from '../../Inputs';
import FieldComponent from '../../FieldComponent';
import DragHandleWrapper from './DragHandleWrapper';
import Preview from './Preview';
import { connect, select } from './utils';

// FIXME
// Temporary workaround to remove the overflow until we migrate the react-select for the relations
// to the DS one
const StyledBox = styled(Box)`
  > div {
    overflow: visible;
  }
`;

/* eslint-disable react/no-array-index-key */

// Issues:
// https://github.com/react-dnd/react-dnd/issues/1368
// https://github.com/frontend-collective/react-sortable-tree/issues/490

const DraggedItem = ({
  componentFieldName,
  // FIXME: errors
  // doesPreviousFieldContainErrorsAndIsOpen,
  // hasErrors,
  // hasMinError,
  // isFirst,
  isOdd,
  isOpen,
  isReadOnly,
  onClickToggle,
  schema,
  toggleCollapses,
  // Retrieved from the select function
  moveComponentField,
  removeRepeatableField,
  triggerFormValidation,
  // checkFormErrors,
  displayedValue,
}) => {
  const dragRef = useRef(null);
  const dropRef = useRef(null);
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
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: false });
  }, [preview]);

  // Create the refs
  // We need 1 for the drop target
  // 1 for the drag target
  const refs = {
    dragRef: drag(dragRef),
    dropRef: drop(dropRef),
  };

  return (
    <StyledBox ref={refs ? refs.dropRef : null}>
      {isDragging && <Preview />}
      {!isDragging && (
        <Accordion expanded={isOpen} toggle={onClickToggle} id={componentFieldName}>
          <AccordionToggle
            variant={isOdd ? 'primary' : 'secondary'}
            title={toString(displayedValue)}
            togglePosition="left"
            action={
              isReadOnly ? null : (
                <Row>
                  <IconButton
                    onClick={() => {
                      removeRepeatableField(componentFieldName);
                      toggleCollapses();
                    }}
                    label={formatMessage({
                      id: getTrad('containers.Edit.delete'),
                      defaultMessage: 'Edit',
                    })}
                    icon={<DeleteIcon />}
                  />
                  <Box paddingLeft={2}>
                    <DragHandleWrapper
                      ref={refs.dragRef}
                      label={formatMessage({
                        id: getTrad('components.DragHandle-label'),
                        defaultMessage: 'Drag',
                      })}
                      icon={<DragHandle />}
                    />
                  </Box>
                </Row>
              )
            }
          />
          <AccordionContent>
            <Box
              background="neutral100"
              paddingLeft={6}
              paddingRight={6}
              paddingTop={6}
              paddingBottom={6}
            >
              <Stack size={6}>
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
            </Box>
          </AccordionContent>
        </Accordion>
      )}
    </StyledBox>
  );
};

DraggedItem.defaultProps = {
  // doesPreviousFieldContainErrorsAndIsOpen: false,
  // hasErrors: false,
  // hasMinError: false,
  // isFirst: false,
  isOpen: false,
  toggleCollapses: () => {},
};

DraggedItem.propTypes = {
  componentFieldName: PropTypes.string.isRequired,
  // doesPreviousFieldContainErrorsAndIsOpen: PropTypes.bool,
  // hasErrors: PropTypes.bool,
  // hasMinError: PropTypes.bool,
  // isFirst: PropTypes.bool,
  isOdd: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool,
  isReadOnly: PropTypes.bool.isRequired,
  onClickToggle: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
  toggleCollapses: PropTypes.func,
  moveComponentField: PropTypes.func.isRequired,
  removeRepeatableField: PropTypes.func.isRequired,
  triggerFormValidation: PropTypes.func.isRequired,
  // checkFormErrors: PropTypes.func.isRequired,
  displayedValue: PropTypes.string.isRequired,
};

const Memoized = memo(DraggedItem);

export default connect(
  Memoized,
  select
);

export { DraggedItem };
