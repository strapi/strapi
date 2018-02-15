/**
 *
 * ContainerFluid
 * div component that is useful for wrapping your view into
 * only scss
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

function ContainerFluid({ children }) {
  return (
    <div className={styles.helperContainerFluid}>
      {children}
    </div>
  );
}

ContainerFluid.defaultProps = {
  children: <div />,
};

ContainerFluid.propTypes = {
  children: PropTypes.node,
};

export default ContainerFluid;
