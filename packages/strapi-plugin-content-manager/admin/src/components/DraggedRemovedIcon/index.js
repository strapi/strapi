/**
 * 
 * DraggedRemovedIcon
 * 
 */

import React from 'react';
import PropTypes from 'prop-types';
import styles from './styles.scss';

function DraggedRemovedIcon({ isDragging, onRemove, withLongerHeight, ...rest }) {
  let className;

  if (isDragging && withLongerHeight) {
    className = styles.removeIconLongerDragged;
  } else if (withLongerHeight) {
    className = styles.removeIconLonger;
  } else if (isDragging) {
    className = styles.removeIconDragged;
  } else {
    className = styles.removeIcon;
  }

  return (
    <span
      className={className}
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