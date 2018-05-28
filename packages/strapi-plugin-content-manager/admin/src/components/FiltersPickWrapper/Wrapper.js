import React from 'react';
import PropTypes from 'prop-types';

import styles from './wrapperStyles.scss';

const Wrapper = ({ children }) => <div className={styles.wrapperStyle}>{children}</div>;

Wrapper.defaultProps = {
  children: null,
};

Wrapper.propTypes = {
  children: PropTypes.any,
};

export default Wrapper;
