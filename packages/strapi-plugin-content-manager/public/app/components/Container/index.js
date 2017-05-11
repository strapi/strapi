/**
 *
 * Container
 *
 */

import React from 'react';
import styles from './styles.scss';

class Container extends React.Component {
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
  children: React.PropTypes.array.isRequired,
};

export default Container;
