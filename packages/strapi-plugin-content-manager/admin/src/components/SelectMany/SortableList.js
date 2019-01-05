/**
 *
 * SortableList
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
// import { SortableContainer } from 'react-sortable-hoc';
import SortableItem from './SortableItem';
// CSS.
import styles from './styles.scss';

const SortableList = ({ items, isDraggingSibling, keys, moveAttr, moveAttrEnd, name, onClick, onRemove }) => {
  return (
    <div className={cn(styles.sortableList)}>
      <ul id={`sortableListOf${name}`}>
        {items.map((item, index) => (
          <SortableItem
            isDraggingSibling={isDraggingSibling}
            key={item.value.id || item.value._id || `item-${index}`}
            keys={keys}
            index={index}
            item={item}
            moveAttr={moveAttr}
            moveAttrEnd={moveAttrEnd}
            onRemove={onRemove}
            onClick={onClick}
          />
        ))}
      </ul>
      {items.length > 4 && <div className={styles.sortableListLong} />}
    </div>
  );
};

SortableList.propTypes = {
  isDraggingSibling: PropTypes.bool.isRequired,
  items: PropTypes.array.isRequired,
  keys: PropTypes.string.isRequired,
  moveAttr: PropTypes.func.isRequired,
  moveAttrEnd: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default SortableList;