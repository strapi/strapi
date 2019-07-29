/**
 *
 * HeaderNav
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { map } from 'lodash';
import PropTypes from 'prop-types';

// Utils
import { darken } from '../../utils/colors';

// Styles
import styles from './styles.scss';

function HeaderNav({ links, style }) {
  let linkColor = '#F5F5F5';

  return (
    <div className={styles.headerContainer} style={style}>
      {map(links, link => {
        linkColor = darken(linkColor, 1.5);

        return (
          <NavLink
            key={link.name}
            className={styles.headerLink}
            style={{ backgroundColor: linkColor }}
            to={link.to}
            activeClassName={styles.linkActive}
            isActive={(match, location) => {
              return location.pathname === link.to.split('?')[0];
            }}
          >
            <div className={`${styles.linkText} text-center`}>
              <FormattedMessage id={link.name} defaultMessage={link.name} />
              {link.active && <div className={styles.notifPoint} />}
            </div>
          </NavLink>
        );
      })}
    </div>
  );
}

HeaderNav.defaultProps = {
  links: [],
  style: {},
};

HeaderNav.propTypes = {
  links: PropTypes.arrayOf(
    PropTypes.shape({
      active: PropTypes.bool,
      name: PropTypes.string,
      to: PropTypes.string,
    })
  ),
  style: PropTypes.object,
};

export default HeaderNav;
