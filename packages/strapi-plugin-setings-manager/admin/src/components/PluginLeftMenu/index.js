/**
*
* PluginLeftMenu
*
*/

import React from 'react';


import styles from './styles.scss';

function PluginLeftMenu() {
  const sayHi = () => console.log('ok');
  return (
    <div className={styles.pluginLeftMenu}>
      <div onClick={sayHi}>kjkjkj</div>
    </div>
  );
}

export default PluginLeftMenu;
