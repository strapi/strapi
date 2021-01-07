/*
 *
 * LeftMenu
 *
 */

import React, {
  forwardRef,
  memo,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
} from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';

import { UserContext, hasPermissions, request } from 'strapi-helper-plugin';
import {
  LeftMenuLinksSection,
  LeftMenuFooter,
  LeftMenuHeader,
  LinksContainer,
} from '../../components/LeftMenu';
import { useSettingsMenu } from '../../hooks';
import { generateModelsLinks, filterLinks } from './utils';
import init from './init';
import reducer, { initialState } from './reducer';
import Loader from './Loader';
import Wrapper from './Wrapper';

const LeftMenu = forwardRef(({ shouldUpdateStrapi, version, plugins }, ref) => {
  const location = useLocation();
  const permissions = useContext(UserContext);
  const { menu: settingsMenu } = useSettingsMenu(true);

  // TODO: this needs to be added to the settings API in the v4
  const settingsLinkNotificationCount = useMemo(() => {
    if (shouldUpdateStrapi) {
      return 1;
    }

    return 0;
  }, [shouldUpdateStrapi]);
  const [
    {
      collectionTypesSectionLinks,
      generalSectionLinks,
      isLoading,
      pluginsSectionLinks,
      singleTypesSectionLinks,
    },
    dispatch,
  ] = useReducer(reducer, initialState, () =>
    init(initialState, plugins, settingsMenu, settingsLinkNotificationCount)
  );
  const generalSectionLinksFiltered = useMemo(() => filterLinks(generalSectionLinks), [
    generalSectionLinks,
  ]);
  const pluginsSectionLinksFiltered = useMemo(() => filterLinks(pluginsSectionLinks), [
    pluginsSectionLinks,
  ]);

  const singleTypesSectionLinksFiltered = useMemo(() => filterLinks(singleTypesSectionLinks), [
    singleTypesSectionLinks,
  ]);
  const collectTypesSectionLinksFiltered = useMemo(() => filterLinks(collectionTypesSectionLinks), [
    collectionTypesSectionLinks,
  ]);

  // TODO:
  // This is making a lot of request especially for the Author role as all permissions are being sent to
  // to the backend.
  // We should improve this by sending one request in with all permissions in bulk using the
  // findMatchingPermissions util from the helper plugin and the /users/me/permissions endPoint
  const checkPermissions = async (index, permissionsToCheck) => {
    const hasPermission = await hasPermissions(permissions, permissionsToCheck);

    return { index, hasPermission };
  };

  const generateArrayOfPromises = array =>
    array.map((_, index) => checkPermissions(index, array[index].permissions));

  const getModels = async () => {
    const requestURL = '/content-manager/content-types';

    try {
      const { data } = await request(requestURL, { method: 'GET' });

      const formattedData = generateModelsLinks(data);

      const collectionTypesSectionLinksArrayOfPromises = generateArrayOfPromises(
        formattedData.collectionTypesSectionLinks
      );
      const collectionTypesSectionResults = await Promise.all(
        collectionTypesSectionLinksArrayOfPromises
      );

      const singleTypesSectionLinksArrayOfPromises = generateArrayOfPromises(
        formattedData.singleTypesSectionLinks
      );
      const singleTypesSectionResults = await Promise.all(singleTypesSectionLinksArrayOfPromises);

      dispatch({
        type: 'GET_MODELS_SUCCEEDED',
        data: formattedData,
      });

      dispatch({
        type: 'SET_LINK_PERMISSIONS',
        data: {
          collectionTypesSectionLinks: collectionTypesSectionResults,
          singleTypesSectionLinks: singleTypesSectionResults,
        },
      });
    } catch (err) {
      console.error(err);
      strapi.notification.toggle({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    }
  };

  // Make the getModels method available for all the other plugins
  // So they can regenerate the menu when they need
  // It's specially used in the content type builder
  useImperativeHandle(ref, () => ({
    getModels,
  }));

  useEffect(() => {
    const getLinksPermissions = async () => {
      const generalSectionLinksArrayOfPromises = generateArrayOfPromises(generalSectionLinks);
      const pluginsSectionLinksArrayOfPromises = generateArrayOfPromises(pluginsSectionLinks);

      await getModels();

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
  }, [permissions]);

  return (
    <Wrapper>
      <Loader show={isLoading} />
      <LeftMenuHeader />
      <LinksContainer>
        {collectTypesSectionLinksFiltered.length > 0 && (
          <LeftMenuLinksSection
            section="collectionType"
            name="collectionType"
            links={collectTypesSectionLinksFiltered}
            location={location}
            searchable
          />
        )}
        {singleTypesSectionLinksFiltered.length > 0 && (
          <LeftMenuLinksSection
            section="singleType"
            name="singleType"
            links={singleTypesSectionLinksFiltered}
            location={location}
            searchable
          />
        )}

        {pluginsSectionLinksFiltered.length > 0 && (
          <LeftMenuLinksSection
            section="plugins"
            name="plugins"
            links={pluginsSectionLinksFiltered}
            location={location}
            searchable={false}
            emptyLinksListMessage="app.components.LeftMenuLinkContainer.noPluginsInstalled"
          />
        )}
        {generalSectionLinksFiltered.length > 0 && (
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
});

LeftMenu.propTypes = {
  shouldUpdateStrapi: PropTypes.bool.isRequired,
  version: PropTypes.string.isRequired,
  plugins: PropTypes.object.isRequired,
};

export default memo(LeftMenu);
