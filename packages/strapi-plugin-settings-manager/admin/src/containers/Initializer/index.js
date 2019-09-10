/**
 *
 * Initializer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import pluginId from '../../pluginId';

export class Initializer extends React.PureComponent {
  // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    const {
      admin: { autoReload, currentEnvironment },
    } = this.props;
    let preventComponentRendering;
    let blockerComponentProps;

    if (currentEnvironment === 'production') {
      preventComponentRendering = true;
      blockerComponentProps = {
        blockerComponentTitle: 'components.ProductionBlocker.header',
        blockerComponentDescription: 'components.ProductionBlocker.description',
        blockerComponentIcon: 'fa-ban',
        blockerComponentContent: 'renderButton',
      };
    } else {
      // Don't render the plugin if the server autoReload is disabled
      preventComponentRendering = !autoReload;
      blockerComponentProps = {
        blockerComponentTitle: 'components.AutoReloadBlocker.header',
        blockerComponentDescription: 'components.AutoReloadBlocker.description',
        blockerComponentIcon: 'fa-refresh',
        blockerComponentContent: 'renderIde',
      };
    }

    // Prevent the plugin from being rendered if currentEnvironment === PRODUCTION
    this.props.updatePlugin(pluginId, 'preventComponentRendering', preventComponentRendering);
    this.props.updatePlugin(pluginId, 'blockerComponentProps', blockerComponentProps);
    // Emit the event plugin ready
    this.props.updatePlugin(pluginId, 'isReady', true);
  }

  render() {
    return null;
  }
}

Initializer.propTypes = {
  admin: PropTypes.object.isRequired,
  updatePlugin: PropTypes.func.isRequired,
};

export default Initializer;
