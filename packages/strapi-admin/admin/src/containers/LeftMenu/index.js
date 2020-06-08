/*
 *
 * LeftMenu
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import {
  LeftMenuLinksSection,
  LeftMenuFooter,
  LeftMenuHeader,
  LeftMenuLinkContainer,
  LinksContainer,
} from '../../components/LeftMenu';
import { SETTINGS_BASE_URL } from '../../config';

import Wrapper from './Wrapper';

const LeftMenu = ({ version, plugins }) => {
  const location = useLocation();
  const general = {
    searchable: false,
    name: 'general',
    links: [
      {
        icon: 'list',
        label: 'app.components.LeftMenuLinkContainer.listPlugins',
        destination: '/list-plugins',
      },
      {
        icon: 'shopping-basket',
        label: 'app.components.LeftMenuLinkContainer.installNewPlugin',
        destination: '/marketplace',
      },
      {
        icon: 'cog',
        label: 'app.components.LeftMenuLinkContainer.settings',
        destination: SETTINGS_BASE_URL,
      },
    ],
  };

  return (
    <Wrapper>
      <LeftMenuHeader />
      <LinksContainer>
        <LeftMenuLinkContainer plugins={plugins} />
        <LeftMenuLinksSection section="general" {...general} location={location} />
      </LinksContainer>
      <LeftMenuFooter key="footer" version={version} />
    </Wrapper>
  );
};

LeftMenu.propTypes = {
  version: PropTypes.string.isRequired,
  plugins: PropTypes.object.isRequired,
};

export default LeftMenu;
