/**
 *
 * Initializer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

export class Initializer extends React.PureComponent { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    this.props.updatePlugin('content-manager', 'isReady', true);
  }

  render() {
    return null;
  }
}

Initializer.propTypes = {
  updatePlugin: PropTypes.func.isRequired,
};

export default Initializer;
