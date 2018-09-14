/**
 * 
 * SelectManyDraggedItem
 */

import React from 'react';
import PropTypes from 'prop-types';
import styles from 'components/SelectMany/styles.scss';
import Content from './Content';


function SelectManyDraggedItem(props) {
  if (props.withLiWrapper) {
    return (
      <li className={styles.sortableListItem} style={{ padding: '0 2px' }}>
        <Content {...props} />
      </li>
    );
  }

  return <Content {...props} />;
}

SelectManyDraggedItem.defaultProps = {
  index: 0,
  onClick: () => {},
  onRemove: () => {},
  withLiWrapper: false,
};

SelectManyDraggedItem.propTypes = {
  index: PropTypes.number,
  item: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
  withLiWrapper: PropTypes.bool,
};

export default SelectManyDraggedItem;