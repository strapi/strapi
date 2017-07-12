/**
*
* PluginLeftMenu
*
*/

import React from 'react';

import PluginLeftMenuHeader from 'components/PluginLeftMenuHeader';
import styles from './styles.scss';

class PluginLeftMenu extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className={`${styles.pluginLeftMenu} col-md-3`}>
        <PluginLeftMenuHeader />
      </div>
    );
  }
}



// function PluginLeftMenu() {
//   return (
//     <div className={`${styles.pluginLeftMenu} col-md-3`}>
//       <PluginLeftMenuHeader />
//     </div>
//   );
// }

export default PluginLeftMenu;
