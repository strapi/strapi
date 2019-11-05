import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Collapse } from 'reactstrap';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import useDataManager from '../../hooks/useDataManager';
import ItemTypes from '../../utils/ItemTypes';
import Inputs from '../Inputs';
import FieldComponent from '../FieldComponent';
import Banner from './Banner';
import FormWrapper from './FormWrapper';

const DraggedItem = ({
  componentFieldName,
  fields,
  isOpen,
  moveCollapse,
  onClickToggle,
  removeCollapse,
  schema,
  toggleCollapses,
}) => {
  const {
    modifiedData,
    moveComponentField,
    removeRepeatableField,
  } = useDataManager();
  const mainField = get(schema, ['settings', 'mainField'], 'id');
  const displayedValue = get(
    modifiedData,
    [...componentFieldName.split('.'), mainField],
    null
  );
  const dragRef = useRef(null);
  const dropRef = useRef(null);

  const [, drop] = useDrop({
    accept: ItemTypes.COMPONENT,
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
      if (dragPath === hoverPath) {
        return;
      }

      // Don't replace items with themselves
      if (dragPath === hoverPath) {
        return;
      }
      // Determine rectangle on screen
      const hoverBoundingRect = dropRef.current.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
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

      return;
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
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: false });
  }, [preview]);

  const getField = fieldName =>
    get(schema, ['schema', 'attributes', fieldName], {});
  const getMeta = fieldName =>
    get(schema, ['metadatas', fieldName, 'edit'], {});

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
        displayedValue={displayedValue}
        isDragging={isDragging}
        isOpen={isOpen}
        onClickToggle={onClickToggle}
        onClickRemove={() => {
          removeRepeatableField(componentFieldName);
          removeCollapse();
        }}
        ref={refs}
      />
      <Collapse isOpen={isOpen} style={{ backgroundColor: '#FAFAFB' }}>
        <FormWrapper isOpen={isOpen}>
          {fields.map((fieldRow, key) => {
            return (
              <div className="row" key={key}>
                {fieldRow.map(field => {
                  const currentField = getField(field.name);
                  const isComponent =
                    get(currentField, 'type', '') === 'component';
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
                        name={keys}
                      />
                    );
                  }

                  return (
                    <div key={field.name} className={`col-${field.size}`}>
                      <Inputs
                        autoFocus={false}
                        keys={keys}
                        layout={schema}
                        name={field.name}
                        onChange={() => {}}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </FormWrapper>
      </Collapse>
    </>
  );
};

DraggedItem.defaultProps = {
  fields: [],
  isOpen: false,
  moveCollapse: () => {},
  toggleCollapses: () => {},
};

DraggedItem.propTypes = {
  componentFieldName: PropTypes.string.isRequired,
  fields: PropTypes.array,
  isOpen: PropTypes.bool,
  moveCollapse: PropTypes.func,
  onClickToggle: PropTypes.func.isRequired,
  removeCollapse: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
  toggleCollapses: PropTypes.func,
};

export default DraggedItem;
