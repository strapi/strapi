import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

const LoadingBar = ({ style }) => <div className={styles.loaderBar} style={style} />;

LoadingBar.defaultProps = {
  style: {},
};

LoadingBar.propTypes = {
  style: PropTypes.object,
};

export default LoadingBar;