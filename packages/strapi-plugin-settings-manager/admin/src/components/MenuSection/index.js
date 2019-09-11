import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';

const MenuSection = ({ currentEnvironment, items, name, withEnv }) => {
  return (
    <section>
      <h3>
        <FormattedMessage id={`${pluginId}.${name}`} />
      </h3>
      <ul className="menu-list">
        {items.map(link => {
          const base = `/plugins/${pluginId}/${link.slug}`;
          const to = withEnv ? `${base}/${currentEnvironment}` : base;
          return (
            <li key={link.slug}>
              <NavLink to={to}>
                <p>
                  <i className={`fa fa-${link.icon}`} />
                  <FormattedMessage id={`${pluginId}.${link.name}`} />
                </p>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

MenuSection.defaultProps = {
  currentEnvironment: 'development',
  withEnv: false,
};

MenuSection.propTypes = {
  currentEnvironment: PropTypes.string,
  items: PropTypes.array.isRequired,
  name: PropTypes.string.isRequired,
  withEnv: false,
};

export default MenuSection;
