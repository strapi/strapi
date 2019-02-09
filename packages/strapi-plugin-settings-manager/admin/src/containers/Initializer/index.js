/**
 *
 * Initializer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';


export class Initializer extends React.PureComponent { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    const { admin: { autoReload } } = this.props;
    const { env: { NODE_ENV } } = process;
    let preventComponentRendering;
    let blockerComponentProps;

    if (NODE_ENV === 'production') {
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
    
    // Prevent the plugin from being rendered if ENV === PRODUCTION
    this.props.updatePlugin('settings-manager', 'preventComponentRendering', preventComponentRendering);
    this.props.updatePlugin('settings-manager', 'blockerComponentProps', blockerComponentProps);
    // Emit the event plugin ready
    this.props.updatePlugin('settings-manager', 'isReady', true);
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
