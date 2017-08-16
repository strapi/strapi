/**
*
* LeftMenuHeader
*
*/

import React from 'react';
import { Link } from 'react-router';

import styles from './styles.scss';

class LeftMenuHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.leftMenuHeader}>
        <Link to="/" className={styles.leftMenuHeaderLink}>
          <span className={styles.projectName}></span>
        </Link>
      </div>
    );
  }
}

export default LeftMenuHeader;
