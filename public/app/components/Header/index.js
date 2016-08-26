/**
*
* Header
*
*/

import React from 'react';

import styles from './styles.scss';

class Header extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.header}>
        <div className="container-fluid">
          <div className="pull-md-right cursor-pointer">
            <span>John Doe</span>
          </div>
        </div>
      </div>
    );
  }
}

export default Header;
