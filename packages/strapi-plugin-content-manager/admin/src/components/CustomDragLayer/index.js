/**
 * 
 * CustomDragLayer
 */

import React from 'react';
import PropTypes from 'prop-types';
import { DragLayer } from 'react-dnd';
import { flow } from 'lodash';

import ItemTypes from '../../utils/ItemTypes';

import DragBox from '../DragBox';
import SelectManyDraggedItem from '../SelectManyDraggedItem';

import styles from './styles.scss';

function getItemStyles(props) {
  const { initialOffset, currentOffset, mouseOffset } = props;

  if (!initialOffset || !currentOffset) {
    return { display: 'none' };
  }

  const { x, y } = mouseOffset;
  const transform = `translate(${x -50}px, ${y-5}px)`;

  return {
    transform,
    WebkitTransform: transform,
  };
}

class CustomDragLayer extends React.Component {
  renderItem(type, item) {
    switch (type) {
      case ItemTypes.VARIABLE:
      case ItemTypes.NORMAL:
        return <DragBox name={item.id} />;
      case ItemTypes.SORTABLEITEM:
        return <SelectManyDraggedItem item={item.data} withLiWrapper />;
      default:
        return null;
    }
  }

  render() {
    const { item, itemType, isDragging } = this.props;

    if (!isDragging) {
      return null;
    }

    return (
      <div className={styles.layer}>
        <div style={getItemStyles(this.props)} className="col-md-2">
          {this.renderItem(itemType, item)}
        </div>
      </div>
    );
  }
}

const withDragLayer = DragLayer(monitor => ({
  item: monitor.getItem(),
  itemType: monitor.getItemType(),
  initialOffset: monitor.getInitialSourceClientOffset(),
  currentOffset: monitor.getSourceClientOffset(),
  isDragging: monitor.isDragging(),
  mouseOffset: monitor.getClientOffset(),
}));

CustomDragLayer.defaultProps = {
  isDragging: false,
  item: null,
  itemType: '',
};

CustomDragLayer.propTypes = {
  isDragging: PropTypes.bool,
  item: PropTypes.object,
  itemType: PropTypes.string,
};

export default flow([withDragLayer])(CustomDragLayer);
