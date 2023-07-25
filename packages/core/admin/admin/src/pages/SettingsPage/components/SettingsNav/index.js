import React from 'react';

import {
  SubNav,
  SubNavHeader,
  SubNavLink,
  SubNavSection,
  SubNavSections,
} from '@strapi/design-system/v2';
import { useTracking } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { NavLink, useLocation } from 'react-router-dom';

import { getSectionsToDisplay } from '../../utils';

const SettingsNav = ({ menu }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();

  const filteredMenu = getSectionsToDisplay(menu);

  const sections = filteredMenu.map((section) => {
    return {
      ...section,
      title: section.intlLabel,
      links: section.links.map((link) => {
        return {
          ...link,
          title: link.intlLabel,
          name: link.id,
        };
      }),
    };
  });

  const label = formatMessage({
    id: 'global.settings',
    defaultMessage: 'Settings',
  });

  const handleClickOnLink = (destination = null) => {
    trackUsage('willNavigate', { from: pathname, to: destination });
  };

  return (
    <SubNav ariaLabel={label}>
      <SubNavHeader label={label} />
      <SubNavSections>
        {sections.map((section) => (
          <SubNavSection key={section.id} label={formatMessage(section.intlLabel)}>
            {section.links.map((link) => {
              return (
                <SubNavLink
                  as={NavLink}
                  withBullet={link.hasNotification}
                  to={link.to}
                  onClick={() => handleClickOnLink(link.to)}
                  key={link.id}
                >
                  {formatMessage(link.intlLabel)}
                </SubNavLink>
              );
            })}
          </SubNavSection>
        ))}
      </SubNavSections>
    </SubNav>
  );
};

SettingsNav.propTypes = {
  menu: PropTypes.array.isRequired,
};

export default SettingsNav;
