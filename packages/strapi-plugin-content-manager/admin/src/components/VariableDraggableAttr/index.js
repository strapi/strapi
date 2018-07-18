/**
 * 
 * VariableDraggableAttr
 */

/* eslint-disable react/no-find-dom-node */
import React from 'react';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom';
import {
  DragSource,
  DropTarget,
} from 'react-dnd';
import { flow } from 'lodash';
import cn from 'classnames';

import ClickOverHint from 'components/ClickOverHint';
import DraggedRemovedIcon  from 'components/DraggedRemovedIcon';

import styles from './styles.scss';

const getBootstrapClass = attrType => {
  switch(attrType) {
    case 'checkbox':
    case 'boolean':
      return {
        bootstrap: 'col-md-3',
        wrapper: cn(styles.attrWrapper),
        withLargerHeight: false,
      };
    case 'date':
      return {
        bootstrap: 'col-md-4',
        wrapper: cn(styles.attrWrapper),
        withLargerHeight: false,
      };
    case 'json':
    case 'wysiwyg':
      return {
        bootstrap: 'col-md-12', 
        wrapper: cn(styles.attrWrapper, styles.customHeight),
        withLargerHeight: true,
      };
    case 'file':
      return {
        bootstrap: 'col-md-6',
        wrapper: cn(styles.attrWrapper, styles.customHeight),
        withLargerHeight: true,
      };
    default:
      return {
        bootstrap: 'col-md-6',
        wrapper: cn(styles.attrWrapper),
        withLargerHeight: false,
      };
  }
};

const variableDraggableAttrSource = {
  beginDrag: props => {

    return {
      index: props.index,
    };
  },
  endDrag: () => {
    return {};
  },
};

const variableDraggableAttrTarget = {
  hover: (props, monitor, component) => {
    const dragIndex = monitor.getItem().index;
    const hoverIndex = props.index;

    // Don't replace items with themselves
    if (dragIndex === hoverIndex) {
      return;
    }

    // Determine rectangle on screen
    const hoverBoundingRect = findDOMNode(component).getBoundingClientRect(); // This appears to be changer the DOM

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

    // Time to actually perform the action
    props.moveAttr(dragIndex, hoverIndex, props.keys);

    // Note: we're mutating the monitor item here!
    // Generally it's better to avoid mutations,
    // but it's good here for the sake of performance
    // to avoid expensive index searches.
    monitor.getItem().index = hoverIndex;
  },
};

class VariableDraggableAttr extends React.PureComponent {
  state = { isOver: false };

  handleMouseEnter= () => {
    if (this.props.data.type !== 'boolean') {
      this.setState({ isOver: true });
    }
  }

  handleMouseLeave = () => this.setState({ isOver: false });

  handleRemove = () => {
    const { index, keys, onRemove } = this.props;
    onRemove(index, keys);
  }

  render() {
    const { isOver } = this.state;
    const { data, name, connectDragSource, connectDropTarget } = this.props;
    // NOTE: waiting for the layout to be in the core_store
    let type = name.includes('long') ? 'wysiwyg' : data.type;

    let classNames = getBootstrapClass(type);
    let style = {};

    if (!type) {
      style = { display: 'none' };
      classNames = {
        bootstrap: name,
        wrapper: cn(styles.attrWrapper),
        withLargerHeight: false,
      };
    }

    return (
      connectDragSource(
        connectDropTarget(
          <div
            className={classNames.bootstrap}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
          >
            <div className={classNames.wrapper} style={style}>
              <i className="fa fa-th" />
              <span>
                {name}
              </span>
              <ClickOverHint show={isOver} />
              <DraggedRemovedIcon withLargerHeight={classNames.withLargerHeight} onRemove={this.handleRemove} />
            </div>
          </div>
        ),
      )
    );

    // return (
    //   <div
    //     className={classNames.bootstrap}
    //     onMouseEnter={this.handleMouseEnter}
    //     onMouseLeave={this.handleMouseLeave}
    //   >
    //     <div className={classNames.wrapper} style={style}>
    //       <i className="fa fa-th" aria-hidden="true" />
    //       <span>
    //         {name}
    //       </span>
    //       <ClickOverHint show={isOver} />
    //       <DraggedRemovedIcon withLargerHeight={classNames.withLargerHeight} onRemove={this.handleRemove} />
    //     </div>
    //   </div>
    // );
  }
}

VariableDraggableAttr.defaultProps = {
  data: {
    type: 'text',
  },
  index: 0,
  keys: '',
  name: '',
  onRemove: () => {},
};

VariableDraggableAttr.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  data: PropTypes.object,
  index: PropTypes.number,
  keys: PropTypes.string,
  name: PropTypes.string,
  onRemove: PropTypes.func,
};

const withDropTarget = DropTarget('variableDraggableAttr', variableDraggableAttrTarget, connect => ({
  connectDropTarget: connect.dropTarget(),
}));

const withDragSource = DragSource('variableDraggableAttr', variableDraggableAttrSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
}));

export default flow([withDropTarget, withDragSource])(VariableDraggableAttr);