/**
 *
 * Initializer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';


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
    this.props.updatePlugin('content-type-builder', 'preventComponentRendering', preventComponentRendering);
    this.props.updatePlugin('content-type-builder', 'blockerComponentProps', blockerComponentProps);
    // Emit the event plugin ready
    this.props.updatePlugin('content-type-builder', 'isReady', true);
  }

  render() {
    return null;
  }
}

Initializer.propTypes = {
  admin: PropTypes.object.isRequired,
  updatePlugin: PropTypes.func.isRequired,
};


function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {},
    dispatch,
  );
}

const withConnect = connect(null, mapDispatchToProps);

export default compose(
  withConnect,
)(Initializer);
