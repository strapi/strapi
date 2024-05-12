import { Icon } from '@strapi/design-system';
import {
  SubNav,
  SubNavHeader,
  SubNavLink,
  SubNavSection,
  SubNavSections,
} from '@strapi/design-system/v2';
import { useTracking } from '@strapi/helper-plugin';
import { Lock } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink, useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { SettingsMenu } from '../../../hooks/useSettingsMenu';

/**
 * TODO: refactor the SubNav entirely, we shouldn't have
 * to do this hack to work a lock at the end. It's a bit hacky.
 */

const CustomIcon = styled(Icon)`
  right: 15px;
  position: absolute;
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
                  // @ts-expect-error – this is an issue with the DS where as props are not inferred
                  to={link.to}
                  onClick={handleClickOnLink(link.to)}
                  key={link.id}
                >
                  {formatMessage(link.intlLabel)}
                  {link?.lockIcon && (
                    <CustomIcon width={`${15 / 16}rem`} height={`${15 / 16}rem`} as={Lock} />
                  )}
                </SubNavLink>
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
