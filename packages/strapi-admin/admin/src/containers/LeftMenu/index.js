/*
 *
 * LeftMenu
 *
 */

import React, { useContext, useEffect, useMemo, useReducer } from 'react';
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
import init from './init';
import reducer, { initialState } from './reducer';
import Loader from './Loader';
import Wrapper from './Wrapper';

const LeftMenu = ({ version, plugins }) => {
  const location = useLocation();
  const permissions = useContext(UserContext);
  const [{ generalSectionLinks, isLoading, pluginsSectionLinks }, dispatch] = useReducer(
    reducer,
    initialState,
    () => init(initialState, plugins)
  );
  const generalSectionLinksFiltered = useMemo(
    () => generalSectionLinks.filter(link => link.isDisplayed),
    [generalSectionLinks]
  );
  const pluginsSectionLinksFiltered = useMemo(
    () => pluginsSectionLinks.filter(link => link.isDisplayed),
    [pluginsSectionLinks]
  );

  console.log(pluginsSectionLinks);

  useEffect(() => {
    const getLinksPermissions = async () => {
      const checkPermissions = async (index, permissionsToCheck) => {
        const hasPermission = await hasPermissions(permissions, permissionsToCheck);

        return { index, hasPermission };
      };

      const generateArrayOfPromises = array =>
        array.map((_, index) => checkPermissions(index, array[index].permissions));

      const generalSectionLinksArrayOfPromises = generateArrayOfPromises(generalSectionLinks);
      const pluginsSectionLinksArrayOfPromises = generateArrayOfPromises(pluginsSectionLinks);

      const generalSectionResults = await Promise.all(generalSectionLinksArrayOfPromises);
      const pluginsSectionResults = await Promise.all(pluginsSectionLinksArrayOfPromises);

      dispatch({
        type: 'SET_LINK_PERMISSIONS',
        data: {
          generalSectionLinks: generalSectionResults,
          pluginsSectionLinks: pluginsSectionResults,
        },
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
        <LeftMenuLinksSection
          section="plugins"
          name="plugins"
          links={pluginsSectionLinksFiltered}
          location={location}
          searchable={false}
          emptyLinksListMessage="app.components.LeftMenuLinkContainer.noPluginsInstalled"
        />
        {generalSectionLinksFiltered.length && (
          <LeftMenuLinksSection
            section="general"
            name="general"
            links={generalSectionLinksFiltered}
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
