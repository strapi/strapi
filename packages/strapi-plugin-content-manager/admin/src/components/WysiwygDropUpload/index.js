/**
 *
 * WysiwygDropUpload
 *
 */

import React from 'react';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/label-has-for */
const WysiwygDropUpload = (props) => {
  return (
    <label
      {...props}
      className={styles.wysiwygDropUpload}
    >
      <input
        onChange={() => {}}
        type="file"
        tabIndex="-1"
      />
    </label>
  );
};

export default WysiwygDropUpload;
