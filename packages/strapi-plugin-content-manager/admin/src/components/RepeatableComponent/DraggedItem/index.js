/* eslint-disable import/no-cycle */
import React, { memo, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Collapse } from 'reactstrap';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import useEditView from '../../../hooks/useEditView';
import ItemTypes from '../../../utils/ItemTypes';
import Inputs from '../../Inputs';
import FieldComponent from '../../FieldComponent';
import Banner from '../Banner';
import FormWrapper from '../FormWrapper';
import { connect, select } from './utils';

/* eslint-disable react/no-array-index-key */

// Issues:
// https://github.com/react-dnd/react-dnd/issues/1368
// https://github.com/frontend-collective/react-sortable-tree/issues/490

const DraggedItem = ({
  componentFieldName,
  componentUid,
  doesPreviousFieldContainErrorsAndIsOpen,
  fields,
  hasErrors,
  hasMinError,
  isFirst,
  isReadOnly,
  isOpen,
  moveCollapse,
  onClickToggle,
  removeCollapse,
  schema,
  toggleCollapses,

  // Retrieved from the select function
  moveComponentField,
  removeRepeatableField,
  triggerFormValidation,
  checkFormErrors,
  displayedValue,
}) => {
  const { setIsDraggingComponent, unsetIsDraggingComponent } = useEditView();
  const dragRef = useRef(null);
  const dropRef = useRef(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowForm(true);
    }
  }, [isOpen]);

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
      // Time to actually perform the action in the synchronized collapses
      moveCollapse(dragIndex, hoverIndex);
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.originalPath = hoverPath;
    },
  });
  const [{ isDragging }, drag, preview] = useDrag({
    item: {
      type: ItemTypes.COMPONENT,
      displayedValue,
      originalPath: componentFieldName,
    },
    begin: () => {
      // Close all collapses
      toggleCollapses(-1);
      // Prevent the relations select from firing requests
      setIsDraggingComponent();
    },
    end: () => {
      // Enable the relations select to fire requests
      unsetIsDraggingComponent();
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

  const getField = fieldName => get(schema, ['schema', 'attributes', fieldName], {});
  const getMeta = fieldName => get(schema, ['metadatas', fieldName, 'edit'], {});

  // Create the refs
  // We need 1 for the drop target
  // 1 for the drag target
  const refs = {
    dragRef: drag(dragRef),
    dropRef: drop(dropRef),
  };

  return (
    <>
      <Banner
        componentFieldName={componentFieldName}
        hasErrors={hasErrors}
        hasMinError={hasMinError}
        isFirst={isFirst}
        displayedValue={displayedValue}
        doesPreviousFieldContainErrorsAndIsOpen={doesPreviousFieldContainErrorsAndIsOpen}
        isDragging={isDragging}
        isOpen={isOpen}
        isReadOnly={isReadOnly}
        onClickToggle={onClickToggle}
        onClickRemove={() => {
          removeRepeatableField(componentFieldName);
          removeCollapse();
        }}
        ref={refs}
      />
      <Collapse
        isOpen={isOpen}
        style={{ backgroundColor: '#FAFAFB' }}
        onExited={() => setShowForm(false)}
      >
        {!isDragging && (
          <FormWrapper hasErrors={hasErrors} isOpen={isOpen} isReadOnly={isReadOnly}>
            {showForm &&
              fields.map((fieldRow, key) => {
                return (
                  <div className="row" key={key}>
                    {fieldRow.map(field => {
                      const currentField = getField(field.name);
                      const isComponent = get(currentField, 'type', '') === 'component';
                      const keys = `${componentFieldName}.${field.name}`;

                      if (isComponent) {
                        const componentUid = currentField.component;
                        const metas = getMeta(field.name);

                        return (
                          <FieldComponent
                            componentUid={componentUid}
                            isRepeatable={currentField.repeatable}
                            key={field.name}
                            label={metas.label}
                            isNested
                            name={keys}
                            max={currentField.max}
                            min={currentField.min}
                          />
                        );
                      }

                      return (
                        <div key={field.name} className={`col-${field.size}`}>
                          <Inputs
                            autoFocus={false}
                            componentUid={componentUid}
                            keys={keys}
                            layout={schema}
                            name={field.name}
                            onBlur={hasErrors ? checkFormErrors : null}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
          </FormWrapper>
        )}
      </Collapse>
    </>
  );
};

DraggedItem.defaultProps = {
  doesPreviousFieldContainErrorsAndIsOpen: false,
  fields: [],
  hasErrors: false,
  hasMinError: false,
  isFirst: false,
  isOpen: false,
  moveCollapse: () => {},
  toggleCollapses: () => {},
};

DraggedItem.propTypes = {
  componentFieldName: PropTypes.string.isRequired,
  componentUid: PropTypes.string.isRequired,
  doesPreviousFieldContainErrorsAndIsOpen: PropTypes.bool,
  fields: PropTypes.array,
  hasErrors: PropTypes.bool,
  hasMinError: PropTypes.bool,
  isFirst: PropTypes.bool,
  isOpen: PropTypes.bool,
  isReadOnly: PropTypes.bool.isRequired,
  moveCollapse: PropTypes.func,
  onClickToggle: PropTypes.func.isRequired,
  removeCollapse: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
  toggleCollapses: PropTypes.func,
  moveComponentField: PropTypes.func.isRequired,
  removeRepeatableField: PropTypes.func.isRequired,
  triggerFormValidation: PropTypes.func.isRequired,
  checkFormErrors: PropTypes.func.isRequired,
  displayedValue: PropTypes.string.isRequired,
};

const Memoized = memo(DraggedItem);

export default connect(Memoized, select);

export { DraggedItem };
