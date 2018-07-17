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
import { flow, upperFirst } from 'lodash';
import PropTypes from 'prop-types';
import cn from 'classnames';

import ClickOverHint from 'components/ClickOverHint';
import DraggedRemovedIcon from 'components/DraggedRemovedIcon';

import styles from './styles.scss';

const draggableAttrSource = {
  beginDrag: (props) => {
    props.updateSiblingHoverState();

    return {
      id: props.id,
      index: props.index,
    };
  },
  endDrag: (props) => {
    props.updateSiblingHoverState();

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
  state = { isOver: false, dragStart: false };

  componentDidUpdate(prevProps) {
    const { isDraggingSibling } = this.props;

    if (isDraggingSibling !== prevProps.isDraggingSibling && isDraggingSibling) {
      this.handleMouseLeave();
    }
  }

  handleClickEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.props.onClickEditListItem(this.props.index);
  }

  handleDragEnd = () => this.setState({ dragStart: false });

  handleDragStart = () => this.setState({ dragStart: true });

  handleMouseEnter = () => {
    if (!this.props.isDraggingSibling) {
      this.setState({ isOver: true });
    }
  };

  handleMouseLeave = () => this.setState({ isOver: false });

  handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.props.onRemove(this.props.index, this.props.keys);
  }

  render() {
    const { label, name, isDragging, isEditing, connectDragSource, connectDropTarget } = this.props;
    const { isOver, dragStart } = this.state;
    const opacity = isDragging ? 0.2 : 1;
    const overClass = isOver ? styles.draggableAttrOvered : '';
    const className = dragStart ? styles.dragged : styles.draggableAttr;

    return (
      connectDragSource(
        connectDropTarget(
          <div
            className={cn(className, isEditing && styles.editingAttr, overClass)}
            onDragStart={this.handleDragStart}
            onDragEnd={this.handleDragEnd}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
            onClick={this.handleClickEdit}
            style={{ opacity }}
          >
            <i className="fa fa-th" aria-hidden="true" />
            <span>{name}</span>
            <ClickOverHint show={isOver && !isDragging} />
            { !isOver && upperFirst(name) !== label && (
              <div className={styles.info}>
                {label}
              </div>
            )}
            {isEditing && !isOver? (
              <span className={styles.editIcon} onClick={this.handleClickEdit} />            
            ) : (
              
              <DraggedRemovedIcon isDragging={dragStart} />
            )}
          </div>
        ),
      )
    );
  }
}

DraggableAttr.defaultProps = {
  isEditing: false,
  onRemove: () => {},
};

DraggableAttr.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  isDragging: PropTypes.bool.isRequired,
  isDraggingSibling: PropTypes.bool.isRequired,
  isEditing: PropTypes.bool,
  keys: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onClickEditListItem: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
};

const withDropTarget = DropTarget('draggableAttr', draggableAttrTarget, connect => ({
  connectDropTarget: connect.dropTarget(),
}));

const withDragSource = DragSource('draggableAttr', draggableAttrSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
}));

export default flow([withDropTarget, withDragSource])(DraggableAttr);