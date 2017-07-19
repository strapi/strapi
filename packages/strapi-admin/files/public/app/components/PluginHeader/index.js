/**
 *
 * PluginHeader
 *
 */

import React from 'react';
import PluginHeaderTitle from 'components/PluginHeaderTitle';
import PluginHeaderActions from 'components/PluginHeaderActions';

import styles from './styles.scss';

class PluginHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={`${styles.pluginHeader} row`}>
        <div className="col-lg-6">
          <PluginHeaderTitle
            title={this.props.title}
            description={this.props.description}
          />
        </div>
        <div className="col-lg-6">
          <PluginHeaderActions
            actions={this.props.actions}
          />
        </div>
      </div>
    );
  }
}

PluginHeader.propTypes = {
  title: React.PropTypes.object,
  description: React.PropTypes.object,
  actions: React.PropTypes.array,
};

export default PluginHeader;
