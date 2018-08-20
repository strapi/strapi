/**
 *
 * SortableList
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { SortableContainer } from 'react-sortable-hoc';
import SortableItem from './SortableItem';
// CSS.
import styles from './styles.scss';

const SortableList = SortableContainer(({ items, onClick, onRemove }) => {
  const shadowList = (items.length > 4 ? <div className={styles.sortableListLong}></div> : '');

  return (
    <div className={cn(styles.sortableList)}>
      <ul>
        {items.map((item, index) => (
          <SortableItem key={`item-${index}`} index={index} sortIndex={index} item={item} onRemove={onRemove} onClick={onClick} />
        ))}
      </ul>
      {shadowList}
    </div>
  );
});

SortableList.propTypes = {
  items: PropTypes.array.isRequired,
  onClick: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default SortableList;