/**
*
* PluginLeftMenu
*
*/

import React from 'react';

import PluginLeftMenuSection from 'components/PluginLeftMenuSection';
import styles from './styles.scss';

class PluginLeftMenu extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className={`${styles.pluginLeftMenu} col-md-3`}>
        {_.map(this.props.sections, (section, index) => (
          <PluginLeftMenuSection key={index} section={section} />
        ))}
      </div>
    );
  }
}

export default PluginLeftMenu;
