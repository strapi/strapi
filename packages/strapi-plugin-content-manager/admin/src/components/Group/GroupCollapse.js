import React, { Fragment, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { DragSource, DropTarget } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { Collapse } from 'reactstrap';

import ItemTypes from '../../utils/ItemTypes';

import GroupBanner from '../GroupBanner';

import { FormWrapper } from './components';
import Form from './Form';

function GroupCollapse({
  checkFormErrors,
  connectDragSource,
  connectDropTarget,
  connectDragPreview,
  doesPreviousFieldContainErrorsAndIsOpen,
  hasErrors,
  isDragging,
  isFirst,
  isOpen,
  layout,
  modifiedData,
  name,
  onChange,
  onClick,
  removeField,
}) {
  const mainField = useMemo(
    () => get(layout, ['settings', 'mainField'], 'id'),
    [layout]
  );

  const fields = get(layout, ['layouts', 'edit'], []);
  const ref = React.useRef(null);

  connectDragSource(ref);
  connectDropTarget(ref);

  useEffect(() => {
    connectDragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [connectDragPreview]);

  return (
    <Fragment>
      <GroupBanner
        doesPreviousFieldContainErrorsAndIsOpen={
          doesPreviousFieldContainErrorsAndIsOpen
        }
        hasErrors={hasErrors}
        isFirst={isFirst}
        isDragging={isDragging}
        isOpen={isOpen}
        modifiedData={modifiedData}
        mainField={mainField}
        name={name}
        onClick={onClick}
        ref={ref}
        removeField={removeField}
      />
      <Collapse isOpen={isOpen} style={{ backgroundColor: '#FAFAFB' }}>
        <FormWrapper hasErrors={hasErrors} isOpen={isOpen}>
          {fields.map((fieldRow, key) => {
            return (
              <div className="row" key={key}>
                {fieldRow.map(field => {
                  const keys = `${name}.${field.name}`;

                  return (
                    <Form
                      checkFormErrors={checkFormErrors}
                      key={keys}
                      modifiedData={modifiedData}
                      keys={keys}
                      fieldName={field.name}
                      layout={layout}
                      onChange={onChange}
                      shouldCheckErrors={hasErrors}
                    />
                  );
                })}
              </div>
            );
          })}
        </FormWrapper>
      </Collapse>
    </Fragment>
  );
}

GroupCollapse.defaultProps = {
  addRelation: () => {},
  doesPreviousFieldContainErrorsAndIsOpen: false,
  hasErrors: false,
  isCreating: true,
  isDragging: false,
  isFirst: false,
  isOpen: false,
  layout: {},
  move: () => {},
  removeField: () => {},
};

GroupCollapse.propTypes = {
  checkFormErrors: PropTypes.func.isRequired,
  connectDragPreview: PropTypes.func.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  doesPreviousFieldContainErrorsAndIsOpen: PropTypes.bool,
  hasErrors: PropTypes.bool,
  isDragging: PropTypes.bool,
  isFirst: PropTypes.bool,
  isOpen: PropTypes.bool,
  layout: PropTypes.object,
  modifiedData: PropTypes.object,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  removeField: PropTypes.func,
};

export default DropTarget(
  ItemTypes.GROUP,
  {
    canDrop: () => true,
    hover(props, monitor) {
      const { id: draggedId } = monitor.getItem();
      const { id: overId } = props;

      if (draggedId !== overId) {
        const { index: overIndex } = props.findField(overId);
        props.move(draggedId, overIndex, props.groupName);
      }
    },
  },
  connect => ({
    connectDropTarget: connect.dropTarget(),
  })
)(
  DragSource(
    ItemTypes.GROUP,
    {
      beginDrag: props => {
        props.collapseAll();
        props.resetErrors();

        return {
          id: props.id,
          mainField: get(props.layout, ['settings', 'mainField'], 'id'),
          modifiedData: props.modifiedData,
          name: props.name,
          originalIndex: props.findField(props.id).index,
        };
      },
      // COMMENTING ON PURPOSE NOT SURE IF WE ALLOW DROPPING OUTSIDE THE DROP TARGET
      // endDrag(props, monitor) {
      //   const { id: droppedId, originalIndex } = monitor.getItem();
      //   const didDrop = monitor.didDrop();

      //   if (!didDrop) {
      //     props.move(droppedId, originalIndex, props.groupName);
      //   }
      // },
    },
    (connect, monitor) => ({
      connectDragSource: connect.dragSource(),
      connectDragPreview: connect.dragPreview(),
      isDragging: monitor.isDragging(),
    })
  )(GroupCollapse)
);
