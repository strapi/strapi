import * as React from 'react';

import { Box, Divider, Flex, FocusTrap, Typography } from '@strapi/design-system';
import { SignOut, Feather, Lock, House } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { useAuth } from '../features/Auth';
import { useTracking } from '../features/Tracking';
import { Menu } from '../hooks/useMenu';
import { getDisplayName } from '../utils/users';

import { MainNav } from './MainNav/MainNav';
import { NavBrand } from './MainNav/NavBrand';
import { NavLink } from './MainNav/NavLink';
import { NavUser } from './MainNav/NavUser';

const LinkUserWrapper = styled(Box)`
  width: 15rem;
  position: absolute;
  bottom: ${({ theme }) => theme.spaces[9]};
  left: ${({ theme }) => theme.spaces[5]};
`;

const LinkUser = styled(RouterNavLink)<{ logout?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-decoration: none;
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[4]}`};
  border-radius: ${({ theme }) => theme.spaces[1]};

  &:hover {
    background: ${({ theme, logout }) =>
      logout ? theme.colors.danger100 : theme.colors.primary100};
    text-decoration: none;
  }

  svg {
    fill: ${({ theme }) => theme.colors.danger600};
  }
`;

const NewNavLinkBadge = styled(NavLink.Badge)`
  span {
    color: ${({ theme }) => theme.colors.neutral0};
  }
`;

const NavListWrapper = styled(Flex)`
  overflow-y: auto;
`;

interface LeftMenuProps extends Pick<Menu, 'generalSectionLinks' | 'pluginsSectionLinks'> {}

const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks }: LeftMenuProps) => {
  const navUserRef = React.useRef<HTMLButtonElement>(null!);
  const [userLinksVisible, setUserLinksVisible] = React.useState(false);
  const user = useAuth('AuthenticatedApp', (state) => state.user);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();
  const logout = useAuth('Logout', (state) => state.logout);
  const userDisplayName = getDisplayName(user);

  const initials = userDisplayName
    .split(' ')
    .map((name) => name.substring(0, 1))
    .join('')
    .substring(0, 2);

  const handleToggleUserLinks = () => setUserLinksVisible((prev) => !prev);

  const handleBlur: React.FocusEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (
      !e.currentTarget.contains(e.relatedTarget) &&
      /**
       * TODO: can we replace this by just using the navUserRef?
       */
      e.relatedTarget?.parentElement?.id !== 'main-nav-user-button'
    ) {
      setUserLinksVisible(false);
    }
  };

  const handleClickOnLink = (destination: string) => {
    trackUsage('willNavigate', { from: pathname, to: destination });
  };

  return (
    <MainNav>
      <NavBrand />

      <Divider />

      <NavListWrapper as="ul" gap={3} direction="column" flex={1} paddingTop={3} paddingBottom={3}>
        <NavLink.Link to="/" onClick={() => handleClickOnLink('/')}>
          <NavLink.Tooltip label={formatMessage({ id: 'global.home', defaultMessage: 'Home' })}>
            <NavLink.Icon>
              <House fill="neutral500" />
            </NavLink.Icon>
          </NavLink.Tooltip>
        </NavLink.Link>
        <NavLink.Link to="/content-manager" onClick={() => handleClickOnLink('/content-manager')}>
          <NavLink.Tooltip
            label={formatMessage({
              id: 'global.content-manager',
              defaultMessage: 'Content manager',
            })}
          >
            <NavLink.Icon>
              <Feather fill="neutral500" />
            </NavLink.Icon>
          </NavLink.Tooltip>
        </NavLink.Link>
        {pluginsSectionLinks.length > 0
          ? pluginsSectionLinks.map((link) => {
              if (link.to === 'content-manager') {
                return null;
              }

              const LinkIcon = link.icon;
              const badgeContent = link?.lockIcon ? <Lock /> : undefined;
              return (
                <NavLink.Link to={link.to} key={link.to} onClick={() => handleClickOnLink(link.to)}>
                  <NavLink.Tooltip label={formatMessage(link.intlLabel)}>
                    <NavLink.Icon>
                      <LinkIcon fill="neutral500" />
                    </NavLink.Icon>
                    {badgeContent && (
                      <NavLink.Badge label="locked" background="transparent" textColor="neutral500">
                        {badgeContent}
                      </NavLink.Badge>
                    )}
                  </NavLink.Tooltip>
                </NavLink.Link>
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

              return (
                <NavLink.Link to={link.to} key={link.to} onClick={() => handleClickOnLink(link.to)}>
                  <NavLink.Tooltip label={formatMessage(link.intlLabel)}>
                    <NavLink.Icon>
                      <LinkIcon fill="neutral500" />
                    </NavLink.Icon>
                    {badgeContent && (
                      <NewNavLinkBadge label={badgeContent} backgroundColor="primary600">
                        {badgeContent}
                      </NewNavLinkBadge>
                    )}
                  </NavLink.Tooltip>
                </NavLink.Link>
              );
            })
          : null}
      </NavListWrapper>
      <NavUser
        id="main-nav-user-button"
        ref={navUserRef}
        onClick={handleToggleUserLinks}
        initials={initials}
      >
        {userDisplayName}
      </NavUser>
      {userLinksVisible && (
        <LinkUserWrapper
          onBlur={handleBlur}
          padding={1}
          shadow="tableShadow"
          background="neutral0"
          hasRadius
        >
          <FocusTrap onEscape={handleToggleUserLinks}>
            <Flex direction="column" alignItems="stretch" gap={0}>
              <LinkUser tabIndex={0} onClick={handleToggleUserLinks} to="/me">
                <Typography>
                  {formatMessage({
                    id: 'global.profile',
                    defaultMessage: 'Profile',
                  })}
                </Typography>
              </LinkUser>
              <LinkUser tabIndex={0} onClick={logout} to="/auth/login">
                <Typography textColor="danger600">
                  {formatMessage({
                    id: 'app.components.LeftMenu.logout',
                    defaultMessage: 'Logout',
                  })}
                </Typography>
                <SignOut />
              </LinkUser>
            </Flex>
          </FocusTrap>
        </LinkUserWrapper>
      )}
    </MainNav>
  );
};

export { LeftMenu };
