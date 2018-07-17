/**
 * 
 * DraggedRemovedIcon
 * 
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

function DraggedRemovedIcon({ isDragging, onRemove, withLargerHeight, ...rest }) {
  return (
    <span
      className={cn( isDragging && styles.removeIconDragged, withLargerHeight ? styles.removeIconLarge : styles.removeIcon)}
      onClick={onRemove}
      {...rest}
    />
  );
}

DraggedRemovedIcon.defaultProps = {
  isDragging: false,
  onRemove: () => {},
  withLargerHeight: false,
};

DraggedRemovedIcon.propTypes = {
  isDragging: PropTypes.bool,
  onRemove: PropTypes.func,
  withLargerHeight: PropTypes.bool,
};

export default DraggedRemovedIcon;