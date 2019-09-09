/**
 *
 * AppLoader
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import makeSelectApp from '../App/selectors';

export class AppLoader extends React.Component {
  shouldLoad = () => {
    const { appPlugins, isLoading, plugins: mountedPlugins } = this.props;

    if (isLoading) {
      return true;
    }

    return appPlugins.length !== Object.keys(mountedPlugins).length;
  };

  render() {
    const { children, hasAdminUser } = this.props;

    return children({ hasAdminUser, shouldLoad: this.shouldLoad() });
  }
}

AppLoader.propTypes = {
  appPlugins: PropTypes.array.isRequired,
  children: PropTypes.func.isRequired,
  hasAdminUser: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  plugins: PropTypes.object.isRequired,
};

const mapStateToProps = makeSelectApp();

export default connect(
  mapStateToProps,
  null
)(AppLoader);
