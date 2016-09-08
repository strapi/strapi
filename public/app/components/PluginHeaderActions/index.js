/**
*
* PluginHeaderActions
*
*/

import React from 'react';

import styles from './styles.css';

class PluginHeaderActions extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={`${styles.pluginHeaderActions} pull-lg-right`}>
        <button type="button" className={`${styles.pluginHeaderActionsButton} btn btn-secondary`}>Cancel</button>
        <button type="button" className={`${styles.pluginHeaderActionsButton} btn btn-primary`}>Save</button>
      </div>
    );
  }
}

export default PluginHeaderActions;
