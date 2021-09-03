import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useHistory } from 'react-router-dom';
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

const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks }) => {
  const { menuLogo } = useConfigurations();
  const { push } = useHistory();
  const [condensed, setCondensed] = usePersistentState('navbar-condensed', false);
  const { userDisplayName } = useAppInfos();

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
          <FormattedMessage id="content-manager.plugin.name" defaultMessage="Content manager" />
        </NavLink>

        {pluginsSectionLinks.length > 0 ? (
          <NavSection label="Plugins">
            {pluginsSectionLinks.map(link => (
              <NavLink to={link.to} key={link.to} icon={<FontAwesomeIcon icon={link.icon} />}>
                <FormattedMessage {...link.intlLabel} />
              </NavLink>
            ))}
          </NavSection>
        ) : null}

        {generalSectionLinks.length > 0 ? (
          <NavSection label="General">
            {generalSectionLinks.map(link => (
              <NavLink
                badgeContent={link.notificationsCount}
                to={link.to}
                key={link.to}
                icon={<FontAwesomeIcon icon={link.icon} />}
              >
                <FormattedMessage {...link.intlLabel} />
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
        {condensed ? (
          <FormattedMessage id="app.components.LeftMenu.expand" />
        ) : (
          <FormattedMessage id="app.components.LeftMenu.collapse" />
        )}
      </NavCondense>
    </MainNav>
  );
};

LeftMenu.propTypes = {
  generalSectionLinks: PropTypes.array.isRequired,
  pluginsSectionLinks: PropTypes.array.isRequired,
};

export default LeftMenu;
