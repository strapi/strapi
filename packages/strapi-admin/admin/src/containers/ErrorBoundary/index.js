/**
 *
 * ErrorBoundary
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { error: null, errorInfo: null };

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    const { error, errorInfo } = this.state;

    if (errorInfo) {
      return (
        <div style={{ background: '#ffff' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {error && error.toString()}
            <br />
            {errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.defaultProps = {
  children: null,
};

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};

export default ErrorBoundary;
