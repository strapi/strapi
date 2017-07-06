/**
*
* PluginLeftMenu
*
*/

import React from 'react';

import PluginLeftMenuHeader from 'components/PluginLeftMenuHeader';
import styles from './styles.scss';

function PluginLeftMenu() {
  return (
    <div className={`${styles.pluginLeftMenu} col-md-3`}>
      <PluginLeftMenuHeader />
    </div>
  );
}

export default PluginLeftMenu;
