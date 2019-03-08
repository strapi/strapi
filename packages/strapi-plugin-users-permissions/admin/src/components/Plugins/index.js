/**
*
* Plugins
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { has, map } from 'lodash';
import PropTypes from 'prop-types';
import cn from 'classnames';

import Plugin from '../Plugin';

import styles from './styles.scss';

class Plugins extends React.Component {
  state = { pluginSelected: '' };

  changePluginSelected = (name) => this.setState({ pluginSelected: name });

  render() {
    return (
      <div className={cn('col-md-7', styles.wrapper)}>
        <div className={styles.plugins}>
          <div className={styles.headerContainer}>
            <div>
              <FormattedMessage id="users-permissions.Plugins.header.title" />
            </div>
            <div>
              <FormattedMessage id="users-permissions.Plugins.header.description" />
            </div>
          </div>
          <div className={cn(styles.pluginsContainer, !has(this.props.plugins, 'application') && styles.pluginsGradient)}>
            {map(Object.keys(this.props.plugins).sort(), (plugin) => (
              <Plugin
                changePluginSelected={this.changePluginSelected}
                key={plugin}
                name={plugin}
                plugin={this.props.plugins[plugin]}
                pluginSelected={this.state.pluginSelected}
              />
            ))}
          </div>
        </div>
      </div>
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
