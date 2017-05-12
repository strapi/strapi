/**
*
* PluginHeader
*
*/

import React from 'react';
import PluginHeaderTitle from 'components/PluginHeaderTitle';

import styles from './styles.scss';

class PluginHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={`${styles.pluginHeader} row`}>
        <div className="row">
          <div className="col-lg-8">
            <PluginHeaderTitle
              title={this.props.title}
              description={this.props.description}
            />
          </div>
        </div>
      </div>
    );
  }
}

PluginHeader.propTypes = {
  title: React.PropTypes.object,
  description: React.PropTypes.object,
};

export default PluginHeader;
