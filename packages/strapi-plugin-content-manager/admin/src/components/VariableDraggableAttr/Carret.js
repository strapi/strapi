/**
 * 
 * Carret
 */

import React from 'react';
import PropTypes from 'prop-types';
import styles from './styles.scss';

const Carret = ({ style }) => {
  return <div style={style} className={styles.carret} />;
};

Carret.defaultProps = {
  style: {},
};

Carret.propTypes = {
  style: PropTypes.object,
};

export default Carret;