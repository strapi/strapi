/**
 * 
 * DragBox
 */

import React from 'react';
import PropTypes from 'prop-types';

import GrabIcon from '../../assets/images/icon_grab_blue.svg';
import DraggedRemovedIcon from '../DraggedRemovedIcon';


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
