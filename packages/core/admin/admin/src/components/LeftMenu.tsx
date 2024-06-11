import * as React from 'react';

import { Divider, Flex, FlexComponent, useCollator } from '@strapi/design-system';
import { Lightning } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { styled } from 'styled-components';

import { useAuth } from '../features/Auth';
import { useTracking } from '../features/Tracking';
import { Menu, MenuItem } from '../hooks/useMenu';
import { getDisplayName } from '../utils/users';

import { MainNav } from './MainNav/MainNav';
import { NavBrand } from './MainNav/NavBrand';
import { NavLink } from './MainNav/NavLink';
import { NavUser } from './MainNav/NavUser';

const sortLinks = (links: MenuItem[]) => {
  return links.sort((a, b) => {
    // if no position is defined, we put the link in the position of the external plugins, before the plugins list
    const positionA = a.position ?? 6;
    const positionB = b.position ?? 6;

    if (positionA < positionB) {
      return -1;
    } else {
      return 1;
    }
  });
};

const NavLinkBadgeCounter = styled(NavLink.Badge)`
  span {
    color: ${({ theme }) => theme.colors.neutral0};
  }
`;

const NavLinkBadgeLock = styled(NavLink.Badge)`
  background-color: transparent;
`;

const NavListWrapper = styled<FlexComponent<'ul'>>(Flex)`
  overflow-y: auto;
`;

interface LeftMenuProps extends Pick<Menu, 'generalSectionLinks' | 'pluginsSectionLinks'> {}

const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks }: LeftMenuProps) => {
  const user = useAuth('AuthenticatedApp', (state) => state.user);
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();
  const userDisplayName = getDisplayName(user);
  const { formatMessage, locale } = useIntl();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const initials = userDisplayName
    .split(' ')
    .map((name) => name.substring(0, 1))
    .join('')
    .substring(0, 2);

  const handleClickOnLink = (destination: string) => {
    trackUsage('willNavigate', { from: pathname, to: destination });
  };

  const listLinksAlphabeticallySorted = [...pluginsSectionLinks, ...generalSectionLinks].sort(
    (a, b) => formatter.compare(formatMessage(a.intlLabel), formatMessage(b.intlLabel))
  );
  const listLinks = sortLinks(listLinksAlphabeticallySorted);

  return (
    <MainNav>
      <NavBrand />

      <Divider />

      <NavListWrapper tag="ul" gap={3} direction="column" flex={1} paddingTop={3} paddingBottom={3}>
        {listLinks.length > 0
          ? listLinks.map((link) => {
              const LinkIcon = link.icon;
              const badgeContentLock = link?.licenseOnly ? (
                <Lightning fill="warning500" />
              ) : undefined;

              const badgeContentNumeric =
                link.notificationsCount && link.notificationsCount > 0
                  ? link.notificationsCount.toString()
                  : undefined;

              const labelValue = formatMessage(link.intlLabel);
              return (
                <Flex tag="li" key={link.to}>
                  <NavLink.Tooltip label={labelValue}>
                    <NavLink.Link
                      to={link.to}
                      onClick={() => handleClickOnLink(link.to)}
                      aria-label={labelValue}
                    >
                      <NavLink.Icon label={labelValue}>
                        <LinkIcon width="2rem" height="2rem" fill="neutral500" />
                      </NavLink.Icon>
                      {badgeContentLock ? (
                        <NavLinkBadgeLock
                          label="locked"
                          textColor="neutral500"
                          paddingLeft={0}
                          paddingRight={0}
                        >
                          {badgeContentLock}
                        </NavLinkBadgeLock>
                      ) : badgeContentNumeric ? (
                        <NavLinkBadgeCounter
                          label={badgeContentNumeric}
                          backgroundColor="primary600"
                          width="2.3rem"
                          color="neutral0"
                        >
                          {badgeContentNumeric}
                        </NavLinkBadgeCounter>
                      ) : null}
                    </NavLink.Link>
                  </NavLink.Tooltip>
                </Flex>
              );
            })
          : null}
      </NavListWrapper>
      <NavUser initials={initials}>{userDisplayName}</NavUser>
    </MainNav>
  );
};

export { LeftMenu };
