import {
  SubNav,
  SubNavHeader,
  SubNavLink,
  SubNavSection,
  SubNavSections,
} from '@strapi/design-system';
import { Lightning } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink, useLocation } from 'react-router-dom';
import { styled } from 'styled-components';

import { useTracking } from '../../../features/Tracking';
import { SettingsMenu } from '../../../hooks/useSettingsMenu';

const CustomIcon = styled(Lightning)`
  right: 15px;
  position: absolute;
  bottom: 50%;
  transform: translateY(50%);

  path {
    fill: ${({ theme }) => theme.colors.warning500};
  }
`;

const Link = styled(SubNavLink)`
  &.active ${CustomIcon} {
    right: 13px;
  }
`;

interface SettingsNavProps {
  menu: SettingsMenu;
}

const SettingsNav = ({ menu }: SettingsNavProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();

  const filteredMenu = menu.filter(
    (section) => !section.links.every((link) => link.isDisplayed === false)
  );

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

  const handleClickOnLink = (destination: string) => () => {
    trackUsage('willNavigate', { from: pathname, to: destination });
  };

  return (
    <SubNav aria-label={label}>
      <SubNavHeader label={label} />
      <SubNavSections>
        {sections.map((section) => (
          <SubNavSection key={section.id} label={formatMessage(section.intlLabel)}>
            {section.links.map((link) => {
              return (
                <Link
                  tag={NavLink}
                  withBullet={link.hasNotification}
                  to={link.to}
                  onClick={handleClickOnLink(link.to)}
                  key={link.id}
                  position="relative"
                >
                  {formatMessage(link.intlLabel)}
                  {link?.licenseOnly && <CustomIcon width="1.5rem" height="1.5rem" />}
                </Link>
              );
            })}
          </SubNavSection>
        ))}
      </SubNavSections>
    </SubNav>
  );
};

export { SettingsNav };
export type { SettingsNavProps };
