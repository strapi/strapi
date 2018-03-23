/**
 *
 * WysiwygDropUpload
 *
 */

import React from 'react';
/* eslint-disable jsx-a11y/label-has-for */
// import PropTypes from 'prop-types';

import styles from './styles.scss';

const WysiwygDropUpload = (props) => {
  // console.log(props);
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
