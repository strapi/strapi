/**
*
* HeaderNav
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { map } from 'lodash';

// Utils
import { darken } from 'utils/colors';

// Styles
import styles from './styles.scss';

const links = [
  {
    name: 'users-permissions.HeaderNav.link.roles',
    to: '/plugins/users-permissions/roles',
  },
  {
    name: 'users-permissions.HeaderNav.link.providers',
    to: '/plugins/users-permissions/providers',
  },
  {
    name: 'users-permissions.HeaderNav.link.emailTemplates',
    to: '/plugins/users-permissions/email-templates',
  },
  {
    name: 'users-permissions.HeaderNav.link.advancedSettings',
    to: '/plugins/users-permissions/advanced-settings',
  },
];

function HeaderNav() {
  let linkColor = '#F5F5F5';

  return (
    <div className={styles.headerNav}>
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-12">
            <div className={styles.headerContainer}>
              {map(links, (link) => {
                linkColor = darken(linkColor, 2);

                return (
                  <NavLink key={link.name} className={styles.headerLink} style={{ backgroundColor: linkColor}} to={link.to} activeClassName={styles.linkActive}>
                    <div className={`${styles.linkText} text-center`}>
                      <FormattedMessage id={link.name} />
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

HeaderNav.proptypes = {

};

export default HeaderNav;
