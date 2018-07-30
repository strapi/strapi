/**
 * 
 * DragBox
 */

import React from 'react';
import PropTypes from 'prop-types';
import DraggedRemovedIcon from 'components/DraggedRemovedIcon';
import styles from './styles.scss';

function DragBox({ name }) {
  return (
    <div className={styles.dragBox}>
      <i className="fa fa-th" aria-hidden="true" />
      <span>{name}</span>
      <DraggedRemovedIcon isDragging />
    </div>
  );
}

DragBox.defaultProps = {
  name: '',
};

DragBox.propTypes = {
  name: PropTypes.string,
};

export default DragBox;