import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import {
  MainNav,
  NavBrand,
  NavSections,
  NavLink,
  NavSection,
  NavUser,
  NavCondense,
  Divider,
  Button,
} from '@strapi/parts';
import ContentIcon from '@strapi/icons/ContentIcon';
import { auth, usePersistentState, useAppInfos } from '@strapi/helper-plugin';
import useConfigurations from '../../hooks/useConfigurations';

// TODO: remove when font-awesome will be removed
const IconWrapper = styled.span`
  svg.svg-inline--fa.fa-w-20 {
    width: 1rem;
  }
`;

const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks }) => {
  const { menuLogo } = useConfigurations();
  const { push } = useHistory();
  const [condensed, setCondensed] = usePersistentState('navbar-condensed', false);
  const { userDisplayName } = useAppInfos();
  const { formatMessage } = useIntl();

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
            {/* This is temporary */}
            <Button
              type="button"
              onClick={() => {
                auth.clearAppStorage();
                push('/auth/login');
              }}
            >
              Logout
            </Button>
          </NavSection>
        ) : null}
      </NavSections>

      <NavUser src="https://avatars.githubusercontent.com/u/3874873?v=4" to="/me">
        {userDisplayName}
      </NavUser>

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
