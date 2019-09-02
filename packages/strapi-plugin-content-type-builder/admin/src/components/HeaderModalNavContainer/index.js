/**
 *
 * HeaderModalNavContainer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import styles from './styles.scss';

function HeaderModalNavContainer({ children }) {
  return <div className={styles.headerModalNavContainer}>{children}</div>;
}

HeaderModalNavContainer.defaultProps = {
  children: null,
};

HeaderModalNavContainer.propTypes = {
  children: PropTypes.node,
};

export default HeaderModalNavContainer;
