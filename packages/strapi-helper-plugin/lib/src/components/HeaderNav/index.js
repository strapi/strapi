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
import Wrapper from './Wrapper';

function HeaderNav({ links, style }) {
  let linkColor = '#F5F5F5';

  return (
    <Wrapper style={style}>
      {map(links, link => {
        linkColor = darken(linkColor, 1.5);

        return (
          <NavLink
            key={link.name}
            className="headerLink"
            style={{
              backgroundColor: linkColor,
              cursor: link.disabled ? 'not-allowed' : 'pointer',
            }}
            to={link.to}
            activeClassName="linkActive"
            isActive={(match, location) => {
              return location.pathname === link.to.split('?')[0];
            }}
            onClick={e => {
              if (link.disabled) {
                e.preventDefault();
              }
            }}
          >
            <div className="linkText text-center">
              <FormattedMessage
                id={link.name}
                defaultMessage={link.name}
                values={link.values}
              />
              {link.active && <div className="notifPoint" />}
            </div>
          </NavLink>
        );
      })}
    </Wrapper>
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
