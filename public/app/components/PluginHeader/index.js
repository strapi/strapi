/**
*
* PluginHeader
*
*/

import React from 'react';
import PluginHeaderTitle from 'components/PluginHeaderTitle';
import PluginHeaderActions from 'components/PluginHeaderActions';

import styles from './styles.css';

class PluginHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={`${styles.pluginHeader} row`}>
        <div className="row">
          <div className="col-lg-8">
            <PluginHeaderTitle></PluginHeaderTitle>
          </div>
          <div className="col-lg-4">
            <PluginHeaderActions></PluginHeaderActions>
          </div>
        </div>
      </div>
    );
  }
}

export default PluginHeader;
