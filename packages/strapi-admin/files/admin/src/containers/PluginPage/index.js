/*
 *
 * PluginPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import { createSelector } from 'reselect';
import { selectPlugins } from 'containers/App/selectors';

export class PluginPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    // Detect plugin id from url params
    const pluginId = this.props.match.params.pluginId;

    const containers = this.props.plugins.valueSeq().map((plugin) => {
      if (plugin.get('id') === pluginId) {
        const Elem = plugin.get('mainComponent');
        return <Elem key={plugin.get('id')} {...this.props} />;
      }
    });

    return (
      <div>
        <Helmet
          title="Strapi - Plugin"
          meta={[
            { name: 'description', content: 'Description of PluginPage' },
          ]}
        />
        {containers}
      </div>
    );
  }
}

PluginPage.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

PluginPage.propTypes = {
  match: React.PropTypes.object.isRequired,
  plugins: React.PropTypes.object.isRequired,
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
