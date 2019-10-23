/**
 *
 * Plugins
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { has, map } from 'lodash';
import PropTypes from 'prop-types';

import Plugin from '../Plugin';

import { Header, PluginsContainer, Wrapper } from './Components';

class Plugins extends React.Component {
  state = { pluginSelected: '' };

  changePluginSelected = name => this.setState({ pluginSelected: name });

  render() {
    return (
      <Wrapper className="col-md-7">
        <div className="plugins-wrapper">
          <Header>
            <div>
              <FormattedMessage id="users-permissions.Plugins.header.title" />
            </div>
            <div>
              <FormattedMessage id="users-permissions.Plugins.header.description" />
            </div>
          </Header>
          <PluginsContainer
            className={
              !has(this.props.plugins, 'application') && 'pluginsGradient'
            }
          >
            {map(Object.keys(this.props.plugins).sort(), plugin => (
              <Plugin
                changePluginSelected={this.changePluginSelected}
                key={plugin}
                name={plugin}
                plugin={this.props.plugins[plugin]}
                pluginSelected={this.state.pluginSelected}
              />
            ))}
          </PluginsContainer>
        </div>
      </Wrapper>
    );
  }
}

Plugins.defaultProps = {
  plugins: {},
};

Plugins.propTypes = {
  plugins: PropTypes.object,
};

export default Plugins;
