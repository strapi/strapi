/*
 *
 * PluginPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import { createSelector } from 'reselect';

import BlockerComponent from 'components/BlockerComponent';
import ErrorBoundary from 'components/ErrorBoundary';

import { selectPlugins } from 'containers/App/selectors';

export class PluginPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    let pluginName;

    // Detect plugin id from url params
    const pluginId = this.props.match.params.pluginId;
    const plugins = this.props.plugins.toJS();

    const containers = Object.keys(plugins).map((name) => {
      const plugin = plugins[name];

      if (plugin.id === pluginId) {
        pluginName = plugin.name;

        const blockerComponentProps = plugin.preventComponentRendering ? plugin.blockerComponentProps : {};
        let Elem = plugin.preventComponentRendering ? BlockerComponent : plugin.mainComponent;

        if (plugin.preventComponentRendering && plugin.blockerComponent) {
          Elem = plugin.blockerComponent;
        }

        return (
          <ErrorBoundary key={plugin.id}>
            <Elem {...this.props} {...blockerComponentProps} />
          </ErrorBoundary>
        );
      }
    });

    return (
      <div>
        <Helmet
          title={`Strapi - ${pluginName}`}
        />
        {containers}
      </div>
    );
  }
}

PluginPage.propTypes = {
  match: PropTypes.object.isRequired,
  plugins: PropTypes.object.isRequired,
};

const mapStateToProps = createSelector(
  selectPlugins(),
  (plugins) => ({ plugins })
);

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(PluginPage);
