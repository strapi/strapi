/**
*
* PluginHeaderTitle
*
*/

import React from 'react';

import styles from './styles.scss';

class PluginHeaderTitle extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.pluginHeaderTitle}>
        <h1 className={styles.pluginHeaderTitleName}>Settings Manager</h1>
        <p className={styles.pluginHeaderTitleDescription}>Easily update your settings</p>
      </div>
    );
  }
}

export default PluginHeaderTitle;
