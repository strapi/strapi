/**
 *
 * PluginHeader
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import PluginHeaderTitle from 'components/PluginHeaderTitle';
import PluginHeaderActions from 'components/PluginHeaderActions';

import styles from './styles.scss';

class PluginHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={`${styles.pluginHeader} row`}>
        <div className="col-lg-7">
          <PluginHeaderTitle
            title={this.props.title}
            description={this.props.description}
          />
        </div>
        <div className="col-lg-2 justify-content-end">
          <PluginHeaderActions
            actions={this.props.subActions || []}
          />
        </div>
        <div className="col-lg-3 justify-content-end">
          <PluginHeaderActions
            actions={this.props.actions || []}
          />
        </div>
      </div>
    );
  }
}

PluginHeader.propTypes = {
  actions: PropTypes.array.isRequired,
  subActions: PropTypes.array,
  description: PropTypes.object.isRequired,
  title: PropTypes.object.isRequired,
};

export default PluginHeader;
