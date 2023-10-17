import * as React from 'react';

import { Box, Divider, Flex, FocusTrap, Typography } from '@strapi/design-system';
import {
  MainNav,
  NavBrand,
  NavCondense,
  NavFooter,
  NavLink,
  NavSection,
  NavSections,
  NavUser,
} from '@strapi/design-system/v2';
import {
  auth,
  getFetchClient,
  useAppInfo,
  usePersistentState,
  useTracking,
} from '@strapi/helper-plugin';
import { Exit, Write } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink as RouterNavLink, useHistory, useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { useConfiguration } from '../hooks/useConfiguration';
import { Menu } from '../hooks/useMenu';

const LinkUserWrapper = styled(Box)`
  width: ${150 / 16}rem;
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
    path {
      fill: ${({ theme }) => theme.colors.danger600};
    }
  }
`;

interface LeftMenuProps extends Pick<Menu, 'generalSectionLinks' | 'pluginsSectionLinks'> {}

const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks }: LeftMenuProps) => {
  const navUserRef = React.useRef<HTMLDivElement>(null!);
  const [userLinksVisible, setUserLinksVisible] = React.useState(false);
  const {
    logos: { menu },
  } = useConfiguration();
  const [condensed, setCondensed] = usePersistentState('navbar-condensed', false);
  const { userDisplayName } = useAppInfo();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();
  const history = useHistory();
  const { post } = getFetchClient();

  const initials = userDisplayName
    .split(' ')
    .map((name) => name.substring(0, 1))
    .join('')
    .substring(0, 2);

  const handleToggleUserLinks = () => setUserLinksVisible((prev) => !prev);

  const handleLogout = async () => {
    await post('/admin/logout');
    auth.clearAppStorage();
    handleToggleUserLinks();
    history.push('/auth/login');
  };

  const handleBlur: React.FocusEventHandler = (e) => {
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

  const menuTitle = formatMessage({
    id: 'app.components.LeftMenu.navbrand.title',
    defaultMessage: 'Strapi Dashboard',
  });

  return (
    <MainNav condensed={condensed}>
      <NavBrand
        as={RouterNavLink}
        workplace={formatMessage({
          id: 'app.components.LeftMenu.navbrand.workplace',
          defaultMessage: 'Workplace',
        })}
        title={menuTitle}
        icon={
          <img
            src={menu.custom || menu.default}
            alt={formatMessage({
              id: 'app.components.LeftMenu.logo.alt',
              defaultMessage: 'Application logo',
            })}
          />
        }
      />

      <Divider />

      <NavSections>
        <NavLink
          as={RouterNavLink}
          // @ts-expect-error the props from the passed as prop are not inferred // joined together
          to="/content-manager"
          icon={<Write />}
          onClick={() => handleClickOnLink('/content-manager')}
        >
          {formatMessage({ id: 'global.content-manager', defaultMessage: 'Content manager' })}
        </NavLink>

        {pluginsSectionLinks.length > 0 ? (
          <NavSection
            label={formatMessage({
              id: 'app.components.LeftMenu.plugins',
              defaultMessage: 'Plugins',
            })}
          >
            {pluginsSectionLinks.map((link) => {
              const Icon = link.icon;

              return (
                <NavLink
                  as={RouterNavLink}
                  // @ts-expect-error the props from the passed as prop are not inferred // joined together
                  to={link.to}
                  key={link.to}
                  icon={<Icon />}
                  onClick={() => handleClickOnLink(link.to)}
                >
                  {formatMessage(link.intlLabel)}
                </NavLink>
              );
            })}
          </NavSection>
        ) : null}

        {generalSectionLinks.length > 0 ? (
          <NavSection
            label={formatMessage({
              id: 'app.components.LeftMenu.general',
              defaultMessage: 'General',
            })}
          >
            {generalSectionLinks.map((link) => {
              const LinkIcon = link.icon;

              return (
                <NavLink
                  as={RouterNavLink}
                  badgeContent={
                    link.notificationsCount && link.notificationsCount > 0
                      ? link.notificationsCount.toString()
                      : undefined
                  }
                  // @ts-expect-error the props from the passed as prop are not inferred // joined together
                  to={link.to}
                  key={link.to}
                  icon={<LinkIcon />}
                  onClick={() => handleClickOnLink(link.to)}
                >
                  {formatMessage(link.intlLabel)}
                </NavLink>
              );
            })}
          </NavSection>
        ) : null}
      </NavSections>

      <NavFooter>
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
                <LinkUser tabIndex={0} onClick={handleLogout} to="/auth/login">
                  <Typography textColor="danger600">
                    {formatMessage({
                      id: 'app.components.LeftMenu.logout',
                      defaultMessage: 'Logout',
                    })}
                  </Typography>
                  <Exit />
                </LinkUser>
              </Flex>
            </FocusTrap>
          </LinkUserWrapper>
        )}

        <NavCondense onClick={() => setCondensed((s) => !s)}>
          {condensed
            ? formatMessage({
                id: 'app.components.LeftMenu.expand',
                defaultMessage: 'Expand the navbar',
              })
            : formatMessage({
                id: 'app.components.LeftMenu.collapse',
                defaultMessage: 'Collapse the navbar',
              })}
        </NavCondense>
      </NavFooter>
    </MainNav>
  );
};

export { LeftMenu };
