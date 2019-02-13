/**
*
* ErrorBoundary
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

class ErrorBoundary extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(errorInfo) {
    return { error: true, errorInfo };
  }

  render() {
    if (this.state.error) {
      return (
        <div>
          <h2><FormattedMessage id="components.ErrorBoundary.title" /></h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <br />
            {this.state.errorInfo.stack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
