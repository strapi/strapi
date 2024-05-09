import * as React from 'react';

import { Divider, Flex, FlexComponent } from '@strapi/design-system';
import { Feather, Lock, House } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { styled } from 'styled-components';

import { useAuth } from '../features/Auth';
import { useTracking } from '../features/Tracking';
import { Menu } from '../hooks/useMenu';
import { getDisplayName } from '../utils/users';

import { MainNav } from './MainNav/MainNav';
import { NavBrand } from './MainNav/NavBrand';
import { NavLink } from './MainNav/NavLink';
import { NavUser } from './MainNav/NavUser';

const NewNavLinkBadge = styled(NavLink.Badge)`
  span {
    color: ${({ theme }) => theme.colors.neutral0};
  }
`;

const NavListWrapper = styled<FlexComponent<'ul'>>(Flex)`
  overflow-y: auto;
`;

interface LeftMenuProps extends Pick<Menu, 'generalSectionLinks' | 'pluginsSectionLinks'> {}

const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks }: LeftMenuProps) => {
  const user = useAuth('AuthenticatedApp', (state) => state.user);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();
  const userDisplayName = getDisplayName(user);

  const initials = userDisplayName
    .split(' ')
    .map((name) => name.substring(0, 1))
    .join('')
    .substring(0, 2);

  const handleClickOnLink = (destination: string) => {
    trackUsage('willNavigate', { from: pathname, to: destination });
  };

  return (
    <MainNav>
      <NavBrand />

      <Divider />

      <NavListWrapper tag="ul" gap={3} direction="column" flex={1} paddingTop={3} paddingBottom={3}>
        <Flex tag="li">
          <NavLink.Tooltip label={formatMessage({ id: 'global.home', defaultMessage: 'Home' })}>
            <NavLink.Link
              to="/"
              onClick={() => handleClickOnLink('/')}
              aria-label={formatMessage({ id: 'global.home', defaultMessage: 'Home' })}
            >
              <NavLink.Icon label={formatMessage({ id: 'global.home', defaultMessage: 'Home' })}>
                <House width="2rem" height="2rem" fill="neutral500" />
              </NavLink.Icon>
            </NavLink.Link>
          </NavLink.Tooltip>
        </Flex>
        <Flex tag="li">
          <NavLink.Tooltip
            label={formatMessage({
              id: 'global.content-manager',
              defaultMessage: 'Content Manager',
            })}
          >
            <NavLink.Link
              to="/content-manager"
              onClick={() => handleClickOnLink('/content-manager')}
              aria-label={formatMessage({
                id: 'global.content-manager',
                defaultMessage: 'Content Manager',
              })}
            >
              <NavLink.Icon
                label={formatMessage({
                  id: 'global.content-manager',
                  defaultMessage: 'Content Manager',
                })}
              >
                <Feather width="2rem" height="2rem" fill="neutral500" />
              </NavLink.Icon>
            </NavLink.Link>
          </NavLink.Tooltip>
        </Flex>
        {pluginsSectionLinks.length > 0
          ? pluginsSectionLinks.map((link) => {
              if (link.to === 'content-manager') {
                return null;
              }

              const LinkIcon = link.icon;
              const badgeContent = link?.lockIcon ? <Lock /> : undefined;

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
                      {badgeContent && (
                        <NavLink.Badge
                          label="locked"
                          background="transparent"
                          textColor="neutral500"
                        >
                          {badgeContent}
                        </NavLink.Badge>
                      )}
                    </NavLink.Link>
                  </NavLink.Tooltip>
                </Flex>
              );
            })
          : null}
        {generalSectionLinks.length > 0
          ? generalSectionLinks.map((link) => {
              const LinkIcon = link.icon;

              const badgeContent =
                link.notificationsCount && link.notificationsCount > 0
                  ? link.notificationsCount.toString()
                  : undefined;

              const labelValue = formatMessage(link.intlLabel);

              return (
                <Flex tag="li" key={link.to}>
                  <NavLink.Tooltip label={labelValue}>
                    <NavLink.Link
                      aria-label={labelValue}
                      to={link.to}
                      onClick={() => handleClickOnLink(link.to)}
                    >
                      <NavLink.Icon label={labelValue}>
                        <LinkIcon width="2rem" height="2rem" fill="neutral500" />
                      </NavLink.Icon>
                      {badgeContent && (
                        <NewNavLinkBadge label={badgeContent} backgroundColor="primary600">
                          {badgeContent}
                        </NewNavLinkBadge>
                      )}
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
