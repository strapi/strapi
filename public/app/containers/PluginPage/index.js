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

    // Init variables
    let content;

    // Detect plugin according to params
    content = this.props.plugins.valueSeq().map(plugin => {
      let Plugin = plugin.mainComponent;
      return <Plugin key={plugin.id} plugin={plugin}></Plugin>;
    });

    return (
      <div>
        <Helmet
          title="Strapi - Plugin"
          meta={[
            { name: 'description', content: 'Description of PluginPage' },
          ]}
        />
        {content}
      </div>
    );
  }
}

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
