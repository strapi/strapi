import React, { Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get } from 'lodash';
import { DragSource, DropTarget } from 'react-dnd';
import { Collapse } from 'reactstrap';

import pluginId from '../../pluginId';
import ItemTypes from '../../utils/ItemTypes';
import Grab from '../../assets/images/grab_icon.svg';
import Logo from '../../assets/images/caret_top.svg';
import GrabBlue from '../../assets/images/grab_icon_blue.svg';
import GrabError from '../../assets/images/grab_icon_error.svg';

import {
  Flex,
  FormWrapper,
  GroupCollapseWrapper,
  ImgWrapper,
} from './components';
import Form from './Form';

function GroupCollapse({
  connectDragSource,
  connectDropTarget,
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
  const displayedValue = get(
    modifiedData,
    [...name.split('.'), mainField],
    null
  );

  const fields = get(layout, ['layouts', 'edit'], []);
  const ref = React.useRef(null);
  const opacity = isDragging ? 0.2 : 1;

  connectDragSource(ref);
  connectDropTarget(ref);

  // TODO change when the error caret top is available
  const logo = hasErrors ? Logo : Logo;
  let grab = isOpen ? GrabBlue : Grab;

  if (hasErrors) {
    grab = GrabError;
  }

  return (
    <Fragment>
      <GroupCollapseWrapper
        doesPreviousFieldContainErrorsAndIsOpen={
          doesPreviousFieldContainErrorsAndIsOpen
        }
        hasErrors={hasErrors}
        isFirst={isFirst}
        isOpen={isOpen}
        onClick={onClick}
        ref={ref}
        style={{ opacity }}
      >
        <Flex>
          <ImgWrapper hasErrors={hasErrors} isOpen={isOpen}>
            <img src={logo} alt="logo" />
          </ImgWrapper>
          <FormattedMessage
            id={`${pluginId}.containers.Edit.pluginHeader.title.new`}
          >
            {msg => {
              return <span>{displayedValue || msg}</span>;
            }}
          </FormattedMessage>
        </Flex>
        <Flex>
          <button
            type="button"
            style={{ marginRight: 8 }}
            onClick={removeField}
          >
            <i className="fa fa-trash" />
          </button>
          <button type="button" style={{ lineHeight: '36px' }}>
            <img
              src={grab}
              alt="grab icon"
              style={{ verticalAlign: 'unset' }}
            />
          </button>
        </Flex>
      </GroupCollapseWrapper>
      <Collapse isOpen={isOpen} style={{ backgroundColor: '#f5f5f5' }}>
        <FormWrapper hasErrors={hasErrors} isOpen={isOpen}>
          {fields.map((fieldRow, key) => {
            return (
              <div className="row" key={key}>
                {fieldRow.map(field => {
                  const keys = `${name}.${field.name}`;

                  return (
                    <Form
                      key={keys}
                      modifiedData={modifiedData}
                      keys={keys}
                      fieldName={field.name}
                      layout={layout}
                      onChange={onChange}
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

        return {
          id: props.id,
          originalIndex: props.findField(props.id).index,
        };
      },

      endDrag(props, monitor) {
        const { id: droppedId, originalIndex } = monitor.getItem();
        const didDrop = monitor.didDrop();

        if (!didDrop) {
          props.move(droppedId, originalIndex, props.groupName);
        }
      },
    },
    (connect, monitor) => ({
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging(),
    })
  )(GroupCollapse)
);
