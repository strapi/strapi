/**
*
* LeftMenu
*
*/

import React from 'react';
import LeftMenuLink from 'components/LeftMenuLink';

import styles from './styles.css';

class LeftMenu extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const links = [{
      label: 'General',
      value: 'general',
    }, {
      label: 'Languages',
      value: 'languages',
    }, {
      label: 'Databases',
      value: 'databases',
    }, {
      label: 'Security',
      value: 'security',
    }, {
      label: 'Server',
      value: 'server',
    }, {
      label: 'Advanced',
      value: 'advanced',
    }];

    const linksElems = links.map((link, i) => (<LeftMenuLink key={i} label={link.label} value={link.value}></LeftMenuLink>));

    return (
      <div className={styles.leftMenu}>
        <nav className={styles.leftMenuNav}>
          <ul className={styles.leftMenuList}>
            {linksElems}
          </ul>
        </nav>
      </div>
    );
  }
}

export default LeftMenu;
