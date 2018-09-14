/**
 * 
 * DragBox
 */

import React from 'react';
import PropTypes from 'prop-types';
import DraggedRemovedIcon from 'components/DraggedRemovedIcon';

import GrabIcon from 'assets/images/icon_grab_blue.svg';

import styles from './styles.scss';


function DragBox({ name }) {
  return (
    <div className={styles.dragBox}>
      <img src={GrabIcon} alt="Grab Icon Active" />
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