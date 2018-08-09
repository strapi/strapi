/**
 *
 * SortableItem
 *
 */

/* eslint-disable react/no-find-dom-node */
import React from 'react';
import { findDOMNode } from 'react-dom';
import { DragSource, DropTarget } from 'react-dnd';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { flow, get } from 'lodash';
// import { SortableElement } from 'react-sortable-hoc';
// Icons.
import IconRemove from 'assets/images/icon_remove.svg';
import ItemTypes from 'utils/ItemTypes';
// CSS.
import styles from './styles.scss';

const sortableItemSource = {
  beginDrag: props => {
    return {
      id: get(props, ['item', 'value', 'id' ]) || get(props, ['item', 'value', '_id'], ''),
      index: props.index,
    };
  },
  endDrag: () => {
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
  render() {
    const {
      connectDragSource,
      connectDropTarget,
      item,
      onClick,
      onRemove,
      sortIndex,
    } = this.props;

    return (
      connectDragSource(
        connectDropTarget(
          <li className={styles.sortableListItem}>
            <div>
              <div className={styles.dragHandle}><span></span></div>
              <FormattedMessage id='content-manager.containers.Edit.clickToJump'>
                {title => (
                  <span 
                    className='sortable-item--value'
                    onClick={() => onClick(item)} 
                    title={title}
                  >
                    {item.label}
                  </span>
                )}
              </FormattedMessage> 
            
            </div>
            <div className={styles.sortableListItemActions}>
              <img src={IconRemove} alt="Remove Icon" onClick={() => onRemove(sortIndex)} />
            </div>
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
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
}));


SortableItem.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  item: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  sortIndex: PropTypes.number.isRequired,
};

export default flow([withDropTarget, withDragSource])(SortableItem);