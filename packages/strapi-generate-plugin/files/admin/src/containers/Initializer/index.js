/**
 *
 * Initializer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';

class Initializer extends React.PureComponent {
  // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    // Emit the event 'pluginReady'
    this.props.updatePlugin(pluginId, 'isReady', true);
  }

  render() {
    return null;
  }
}

Initializer.propTypes = {
  updatePlugin: PropTypes.func.isRequired,
};

export default Initializer;
