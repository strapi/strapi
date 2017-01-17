/**
 *
 * Container
 *
 */

import React from 'react';
import LeftMenu from 'components/LeftMenu';

import styles from './styles.scss';

class Container extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.container}>
        <div className={`row row-eq-height ${styles.containerContent}`}>
          <div className={`col-lg-3 p-l-0 p-r-0 ${styles.containerLeftContent}`}>
            <LeftMenu></LeftMenu>
          </div>
          <div className={`col-lg-9 ${styles.containerRightContent}`}>
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }
}

Container.propTypes = {
  children: React.PropTypes.array,
};

export default Container;
