import React from 'react';
import PropTypes from 'prop-types';

// https://github.com/bvaughn/react-error-boundary#usage

function ErrorFallback({ error /* resetErrorBoundary */ }) {
  return (
    <div style={{ background: '#ffff' }}>
      <h2>Something went wrong.</h2>
      <details style={{ whiteSpace: 'pre-wrap' }}>
        {error.message}
        <br />
        {error.stack}
      </details>
    </div>
  );
}

ErrorFallback.defaultProps = {
  error: { message: null },
  // resetErrorBoundary: PropTypes.func,
};

ErrorFallback.propTypes = {
  error: PropTypes.shape({ message: PropTypes.string }),
  // resetErrorBoundary: PropTypes.func,
};

export default ErrorFallback;
