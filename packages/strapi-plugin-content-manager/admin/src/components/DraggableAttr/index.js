/**
 * 
 * DraggableAttr
 */

/* eslint-disable react/no-find-dom-node */
import React from 'react';
import { findDOMNode } from 'react-dom';
import {
  DragSource,
  DropTarget,
} from 'react-dnd';
import { flow } from 'lodash';
import PropTypes from 'prop-types';
import styles from './styles.scss';

const draggableAttrSource = {
  beginDrag: (props, monitor, component) => {
    const el = findDOMNode(component);
    el.className = styles.dragged;

    return {
      id: props.id,
      index: props.index,
    };
  },
  endDrag: (props, monitor, component) => {
    const el = findDOMNode(component);
    el.className = styles.draggableAttr;

    return {};
  },
};

const draggableAttrTarget = {
  hover: (props, monitor, component) => {
    const dragIndex = monitor.getItem().index;
    const hoverIndex = props.index;

    // Don't replace items with themselves
    if (dragIndex === hoverIndex) {
      return;
    }

    // Determine rectangle on screen
    const hoverBoundingRect = findDOMNode(component).getBoundingClientRect();

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

class DraggableAttr extends React.Component {
  render() {
    const { name, isDragging, connectDragSource, connectDropTarget } = this.props;
    const opacity = isDragging ? 0.4 : 1;

    return (
      connectDragSource(
        connectDropTarget(
          <div
            className={styles.draggableAttr}
            style={{ opacity }}
          >
            {name}
          </div>
        ),
      )
    );
  }
}

DraggableAttr.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
};

const withDropTarget = DropTarget('draggableAttr', draggableAttrTarget, connect => ({
  connectDropTarget: connect.dropTarget(),
}));

const withDragSource = DragSource('draggableAttr', draggableAttrSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
}));

export default flow([withDropTarget, withDragSource])(DraggableAttr);