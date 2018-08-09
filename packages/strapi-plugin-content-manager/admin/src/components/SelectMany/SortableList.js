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

const SortableList = ({ items, keys, moveAttr, onClick, onRemove }) => {
  return (
    <div className={cn(styles.sortableList)}>
      <ul>
        {items.map((item, index) => (
          <SortableItem
            key={`item-${index}`}
            keys={keys}
            index={index}
            item={item}
            moveAttr={moveAttr}
            onRemove={onRemove}
            onClick={onClick}
            sortIndex={index}
          />
        ))}
      </ul>
      {items.length > 4 && <div className={styles.sortableListLong} />}
    </div>
  );
};

SortableList.propTypes = {
  items: PropTypes.array.isRequired,
  keys: PropTypes.string.isRequired,
  moveAttr: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default SortableList;