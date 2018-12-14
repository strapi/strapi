import React from 'react';
import PropTypes from 'prop-types';

import styles from './wrapperStyles.scss';

const Wrapper = ({ children, id }) => <div className={styles.wrapperStyle} id={id}>{children}</div>;

Wrapper.defaultProps = {
  children: null,
  id: '',
};

Wrapper.propTypes = {
  children: PropTypes.any,
  id: PropTypes.string,
};

export default Wrapper;
