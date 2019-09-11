import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';

const MenuSection = ({ name, items }) => {
  return (
    <section>
      <h3>
        <FormattedMessage id={`${pluginId}.${name}`} />
      </h3>
      <ul className="menu-list">
        {items.map(link => {
          return (
            <li key={link.slug}>
              <NavLink to={`/plugins/${pluginId}/${link.slug}`}>
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

MenuSection.propTypes = {
  items: PropTypes.array.isRequired,
  name: PropTypes.string.isRequired,
};

export default MenuSection;
