/**
 *
 * SortableItem
 *
 */

/* eslint-disable react/no-find-dom-node */
import React from 'react';
import { findDOMNode } from 'react-dom';
import { DragSource, DropTarget } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import PropTypes from 'prop-types';
import { flow, get } from 'lodash';
import cn from 'classnames';
import SelectManyDraggedItem from 'components/SelectManyDraggedItem';
import ItemTypes from 'utils/ItemTypes';
import styles from './styles.scss';

const sortableItemSource = {
  beginDrag: props => {
    return {
      id: get(props, ['item', 'value', 'id' ]) || get(props, ['item', 'value', '_id'], ''),
      index: props.index,
      data: props.item,
    };
  },
  endDrag: props => {
    props.moveAttrEnd();
    return {};
  },
};

const sortableItemTarget = {
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

class SortableItem extends React.Component {
  componentDidMount() {
    // Use empty image as a drag preview so browsers don't draw it
    // and we can draw whatever we want on the custom drag layer instead.
    this.props.connectDragPreview(getEmptyImage(), {
      // IE fallback: specify that we'd rather screenshot the node
      // when it already knows it's being dragged so we can hide it with CSS.
      // Removginv the fallabck makes it handle variable height elements
      // captureDraggingState: true,
    });
  }

  render() {
    const {
      connectDragSource,
      connectDropTarget,
      index,
      item,
      isDragging,
      isDraggingSibling,
      onClick,
      onRemove,
    } = this.props;
    const opacity = isDragging ? 0.2 : 1;

    return (
      connectDragSource(
        connectDropTarget(
          <li
            className={cn(styles.sortableListItem, !isDraggingSibling && styles.sortableListItemHover)}
            style={{ opacity }}
          >
            <SelectManyDraggedItem index={index} item={item} onClick={onClick} onRemove={onRemove} />
          </li>
        ),
      )
    );
  }
}

const withDropTarget = DropTarget(ItemTypes.SORTABLEITEM, sortableItemTarget, connect => ({
  connectDropTarget: connect.dropTarget(),
}));

const withDragSource = DragSource(ItemTypes.SORTABLEITEM, sortableItemSource, (connect, monitor) => ({
  connectDragPreview: connect.dragPreview(),
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
}));

SortableItem.defaultProps = {
  isDraggingSibling: false,
};

SortableItem.propTypes = {
  connectDragPreview: PropTypes.func.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  isDragging: PropTypes.bool.isRequired,
  isDraggingSibling: PropTypes.bool,
  item: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default flow([withDropTarget, withDragSource])(SortableItem);