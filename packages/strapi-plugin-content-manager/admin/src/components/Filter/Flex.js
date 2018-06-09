/**
 *
 * Flex
 */

import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

const Flex = ({ children, onClick }) => <div className={styles.flexWrapper} onClick={onClick}>{children}</div>;
Flex.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default Flex;
