/**
 *
 * LoadingIndicatorPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

const LoadingIndicatorPage = (props) => {
  if (props.error) {
    return (
      <div style={{ padding: 40 }}>
        <h2><FormattedMessage id="components.ErrorBoundary.title" /></h2>
        <p>{props.error && props.error.toString()}</p>
        <br />
        <details style={{ whiteSpace: 'pre-wrap' }}>
          {props.error.stack}
        </details>
      </div>
    );
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
