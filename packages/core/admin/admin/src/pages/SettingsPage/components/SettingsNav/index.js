import React from 'react';
import {
  SubNav,
  SubNavHeader,
  SubNavSection,
  SubNavSections,
  SubNavLink,
} from '@strapi/design-system/SubNav';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { getSectionsToDisplay } from '../../utils';

const SettingsNav = ({ menu }) => {
  const { formatMessage } = useIntl();

  const filteredMenu = getSectionsToDisplay(menu);

  const sections = filteredMenu.map(section => {
    return {
      ...section,
      title: section.intlLabel,
      links: section.links.map(link => {
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

  return (
    <SubNav ariaLabel={label}>
      <SubNavHeader label={label} />
      <SubNavSections>
        {sections.map(section => (
          <SubNavSection key={section.id} label={formatMessage(section.intlLabel)}>
            {section.links.map(link => (
              <SubNavLink withBullet={link.hasNotification} to={link.to} key={link.id}>
                {formatMessage(link.intlLabel)}
              </SubNavLink>
            ))}
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
