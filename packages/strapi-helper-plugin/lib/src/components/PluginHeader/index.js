/**
 *
 * PluginHeader
 *
 */

import React from 'react';
import PluginHeaderTitle from 'components/PluginHeaderTitle';
import PluginHeaderActions from 'components/PluginHeaderActions';

import styles from './styles.scss';
// const styles = {};
console.log('styles', styles);


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
  actions: React.PropTypes.array.isRequired,
  description: React.PropTypes.object.isRequired,
  title: React.PropTypes.object.isRequired,
};

export default PluginHeader;
