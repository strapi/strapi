/**
 *
 * LeftMenu
 *
 */

import React from 'react';
import LeftMenuLink from 'components/LeftMenuLink';

import styles from './styles.scss';

class LeftMenu extends React.Component { // eslint-disable-line react/prefer-stateless-function
  links = [{
    value: 'general',
    to: '',
  }, {
    value: 'languages',
    to: 'languages',
  }, {
    value: 'databases',
    to: 'databases',
  }, {
    value: 'security',
    to: 'security',
  }, {
    value: 'server',
    to: 'server',
  }, {
    value: 'advanced',
    to: 'advanced',
  }];

  render() {
    const linksElements = this.links.map((link, i) => (<LeftMenuLink key={i} link={link}></LeftMenuLink>));

    return (
      <div className={styles.leftMenu}>
        <nav className={styles.leftMenuNav}>
          <ul className={styles.leftMenuList}>
            {linksElements}
          </ul>
        </nav>
      </div>
    );
  }
}

export default LeftMenu;
