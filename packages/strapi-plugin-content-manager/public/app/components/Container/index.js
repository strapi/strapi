/**
 *
 * Container
 *
 */

import React from 'react';
import styles from './styles.scss';

class Container extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.container}>
        <div className={`row row-eq-height ${styles.containerContent}`}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

Container.propTypes = {
  children: React.PropTypes.array,
};

export default Container;
