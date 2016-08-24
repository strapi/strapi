/**
*
* LeftMenuHeader
*
*/

import React from 'react';

import styles from './styles.scss';

class LeftMenuHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.leftMenuHeader}>
        <span className={styles.projectName}>MyApp</span>
      </div>
    );
  }
}

export default LeftMenuHeader;
