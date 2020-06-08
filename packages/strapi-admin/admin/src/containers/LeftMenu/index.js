/*
 *
 * LeftMenu
 *
 */

import React, { useContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { UserContext } from 'strapi-helper-plugin';
import {
  LeftMenuLinksSection,
  LeftMenuFooter,
  LeftMenuHeader,
  LeftMenuLinkContainer,
  LinksContainer,
} from '../../components/LeftMenu';
import { hasPermissions } from '../../utils';
import reducer, { initialState } from './reducer';

import Wrapper from './Wrapper';

const LeftMenu = ({ version, plugins }) => {
  const location = useLocation();
  const permissions = useContext(UserContext);
  const [{ generalSectionLinks }, dispatch] = useReducer(reducer, initialState);
  const filteredLinks = generalSectionLinks.filter(link => link.isDisplayed);

  useEffect(() => {
    const getLinksPermissions = async () => {
      generalSectionLinks.forEach(async (_, i) => {
        const hasPermission = await hasPermissions(permissions, generalSectionLinks[i].permissions);

        dispatch({
          type: 'SET_LINK_PERMISSION',
          index: i,
          hasPermission,
        });
      });
    };

    getLinksPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Wrapper>
      <LeftMenuHeader />
      <LinksContainer>
        <LeftMenuLinkContainer plugins={plugins} />
        {filteredLinks.length && (
          <LeftMenuLinksSection
            section="general"
            name="general"
            links={filteredLinks}
            location={location}
            searchable={false}
          />
        )}
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
