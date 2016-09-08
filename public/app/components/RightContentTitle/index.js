/**
*
* RightContentTitle
*
*/

import React from 'react';

import styles from './styles.css';

class RightContentTitle extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.rightContentTitle}>
        <h2 className={styles.rightContentTitleName}>General</h2>
        <p className={styles.rightContentTitleDescription}>Configure your general settings</p>
        <hr className={styles.rigthContentTitleSeparator}></hr>
      </div>
    );
  }
}

export default RightContentTitle;
