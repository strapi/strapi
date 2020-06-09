/*
 *
 * LeftMenu
 *
 */

import React, { useContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { UserContext, hasPermissions } from 'strapi-helper-plugin';
import {
  LeftMenuLinksSection,
  LeftMenuFooter,
  LeftMenuHeader,
  LeftMenuLinkContainer,
  LinksContainer,
} from '../../components/LeftMenu';
import reducer, { initialState } from './reducer';
import Loader from './Loader';
import Wrapper from './Wrapper';

const LeftMenu = ({ version, plugins }) => {
  const location = useLocation();
  const permissions = useContext(UserContext);
  const [{ generalSectionLinks, isLoading }, dispatch] = useReducer(reducer, initialState);
  const filteredLinks = generalSectionLinks.filter(link => link.isDisplayed);

  useEffect(() => {
    const getLinksPermissions = async () => {
      const checkPermissions = async (index, permissionsToCheck) => {
        const hasPermission = await hasPermissions(permissions, permissionsToCheck);

        return { index, hasPermission };
      };

      const generalSectionLinksArrayOfPromises = generalSectionLinks.map((_, index) =>
        checkPermissions(index, generalSectionLinks[index].permissions)
      );

      const results = await Promise.all(generalSectionLinksArrayOfPromises);

      dispatch({
        type: 'SET_LINK_PERMISSIONS',
        results,
      });

      dispatch({
        type: 'TOGGLE_IS_LOADING',
      });
    };

    getLinksPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Wrapper>
      <Loader show={isLoading} />
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
