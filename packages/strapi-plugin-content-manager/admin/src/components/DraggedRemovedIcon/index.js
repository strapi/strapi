/**
 * 
 * DraggedRemovedIcon
 * 
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import styles from './styles.scss';

function DraggedRemovedIcon({ isDragging, onRemove, withLongerHeight, ...rest }) {
  return (
    <span
      className={cn( isDragging && styles.removeIconDragged, withLongerHeight ? styles.removeIconLonger : styles.removeIcon)}
      onClick={onRemove}
      {...rest}
    />
  );
}

DraggedRemovedIcon.defaultProps = {
  isDragging: false,
  onRemove: () => {},
  withLongerHeight: false,
};

DraggedRemovedIcon.propTypes = {
  isDragging: PropTypes.bool,
  onRemove: PropTypes.func,
  withLongerHeight: PropTypes.bool,
};

export default DraggedRemovedIcon;