import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { Divider } from '@strapi/design-system/Divider';
import {
  MainNav,
  NavBrand,
  NavSections,
  NavLink,
  NavSection,
  NavUser,
  NavCondense,
} from '@strapi/design-system/v2/MainNav';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import Write from '@strapi/icons/Write';
import Exit from '@strapi/icons/Exit';
import { auth, usePersistentState, useAppInfos, useTracking } from '@strapi/helper-plugin';
import useConfigurations from '../../hooks/useConfigurations';

const LinkUserWrapper = styled(Box)`
  width: ${150 / 16}rem;
  position: absolute;
  bottom: ${({ theme }) => theme.spaces[9]};
  left: ${({ theme }) => theme.spaces[5]};
`;

const LinkUser = styled(RouterNavLink)`
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

const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks }) => {
  const buttonRef = useRef();
  const [userLinksVisible, setUserLinksVisible] = useState(false);
  const {
    logos: { menu },
  } = useConfigurations();
  const [condensed, setCondensed] = usePersistentState('navbar-condensed', false);
  const { userDisplayName } = useAppInfos();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();

  const initials = userDisplayName
    .split(' ')
    .map((name) => name.substring(0, 1))
    .join('')
    .substring(0, 2);

  const handleToggleUserLinks = () => setUserLinksVisible((prev) => !prev);

  const handleLogout = () => {
    auth.clearAppStorage();
    handleToggleUserLinks();
  };

  const handleBlur = (e) => {
    if (
      !e.currentTarget.contains(e.relatedTarget) &&
      e.relatedTarget?.parentElement?.id !== 'main-nav-user-button'
    ) {
      setUserLinksVisible(false);
    }
  };

  const handleClickOnLink = (destination = null) => {
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
                    (link.notificationsCount > 0 && link.notificationsCount.toString()) || undefined
                  }
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

      <NavUser
        id="main-nav-user-button"
        ref={buttonRef}
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
            <Stack spacing={0}>
              <LinkUser tabIndex={0} onClick={handleToggleUserLinks} to="/me">
                <Typography>
                  {formatMessage({
                    id: 'global.profile',
                    defaultMessage: 'Profile',
                  })}
                </Typography>
              </LinkUser>
              <LinkUser tabIndex={0} onClick={handleLogout} logout="logout" to="/auth/login">
                <Typography textColor="danger600">
                  {formatMessage({
                    id: 'app.components.LeftMenu.logout',
                    defaultMessage: 'Logout',
                  })}
                </Typography>
                <Exit />
              </LinkUser>
            </Stack>
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
    </MainNav>
  );
};

LeftMenu.propTypes = {
  generalSectionLinks: PropTypes.array.isRequired,
  pluginsSectionLinks: PropTypes.array.isRequired,
};

export default LeftMenu;
