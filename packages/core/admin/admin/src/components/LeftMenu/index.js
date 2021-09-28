import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useIntl } from 'react-intl';
import { NavLink as Link } from 'react-router-dom';
import { Divider } from '@strapi/parts/Divider';
import {
  MainNav,
  NavBrand,
  NavSections,
  NavLink,
  NavSection,
  NavUser,
  NavCondense,
} from '@strapi/parts/MainNav';
import { FocusTrap } from '@strapi/parts/FocusTrap';
import { Box } from '@strapi/parts/Box';
import { Text } from '@strapi/parts/Text';
import { Stack } from '@strapi/parts/Stack';
import ContentIcon from '@strapi/icons/ContentIcon';
import Logout from '@strapi/icons/Logout';
import { auth, usePersistentState, useAppInfos } from '@strapi/helper-plugin';
import useConfigurations from '../../hooks/useConfigurations';

// TODO: remove when font-awesome will be removed
const IconWrapper = styled.span`
  svg.svg-inline--fa.fa-w-20 {
    width: 1rem;
  }
`;

const LinkUserWrapper = styled(Box)`
  width: ${150 / 16}rem;
  position: absolute;
  bottom: ${({ theme }) => theme.spaces[9]};
  left: ${({ theme }) => theme.spaces[5]};
`;

const LinkUser = styled(Link)`
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
  const { menuLogo } = useConfigurations();
  const [condensed, setCondensed] = usePersistentState('navbar-condensed', false);
  const { userDisplayName } = useAppInfos();
  const { formatMessage } = useIntl();

  const initials = userDisplayName
    .split(' ')
    .map(name => name.substring(0, 1))
    .join('')
    .substring(0, 2);

  const handleToggleUserLinks = () => setUserLinksVisible(prev => !prev);

  const handleLogout = () => {
    auth.clearAppStorage();
    handleToggleUserLinks();
  };

  const handleBlur = e => {
    if (
      !e.currentTarget.contains(e.relatedTarget) &&
      e.relatedTarget?.parentElement?.id !== 'main-nav-user-button'
    ) {
      setUserLinksVisible(false);
    }
  };

  return (
    <MainNav condensed={condensed}>
      <NavBrand
        workplace="Workplace"
        title="Strapi Dashboard"
        icon={<img src={menuLogo} alt="" />}
      />

      <Divider />

      <NavSections>
        <NavLink to="/content-manager" icon={<ContentIcon />}>
          {formatMessage({ id: 'content-manager.plugin.name', defaultMessage: 'Content manager' })}
        </NavLink>

        {pluginsSectionLinks.length > 0 ? (
          <NavSection label="Plugins">
            {pluginsSectionLinks.map(link => (
              <NavLink
                to={link.to}
                key={link.to}
                icon={
                  <IconWrapper>
                    <FontAwesomeIcon icon={link.icon} />
                  </IconWrapper>
                }
              >
                {formatMessage(link.intlLabel)}
              </NavLink>
            ))}
          </NavSection>
        ) : null}

        {generalSectionLinks.length > 0 ? (
          <NavSection label="General">
            {generalSectionLinks.map(link => (
              <NavLink
                badgeContent={
                  (link.notificationsCount > 0 && link.notificationsCount.toString()) || undefined
                }
                to={link.to}
                key={link.to}
                icon={<FontAwesomeIcon icon={link.icon} />}
              >
                {formatMessage(link.intlLabel)}
              </NavLink>
            ))}
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
        <LinkUserWrapper onBlur={handleBlur} padding={1} shadow="tableShadow" background="neutral0">
          <FocusTrap onEscape={handleToggleUserLinks}>
            <Stack size={0}>
              <LinkUser onClick={handleToggleUserLinks} to="/me">
                <Text>
                  {formatMessage({
                    id: 'app.components.LeftMenu.profile',
                    defaultMessage: 'Profile',
                  })}
                </Text>
              </LinkUser>
              <LinkUser onClick={handleLogout} logout="logout" to="/auth/login">
                <Text textColor="danger600">
                  {formatMessage({
                    id: 'app.components.LeftMenu.logout',
                    defaultMessage: 'Logout',
                  })}
                </Text>
                <Logout />
              </LinkUser>
            </Stack>
          </FocusTrap>
        </LinkUserWrapper>
      )}

      <NavCondense onClick={() => setCondensed(s => !s)}>
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
