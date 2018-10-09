/**
 *
 * LoadingIndicatorPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

const LoadingIndicatorPage = (props) => {

  if (props.error) {
    return <div>An error occurred</div>;
  }

  return (
    <div className={styles.loaderPage}><div /></div>
  );
};

LoadingIndicatorPage.defaultProps = {
  error: null,
};

LoadingIndicatorPage.propTypes = {
  error: PropTypes.object,
};

export default LoadingIndicatorPage;
