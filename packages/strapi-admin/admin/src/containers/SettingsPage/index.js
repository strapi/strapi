/**
 *
 * SettingsPage
 *
 */

// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file you also need to update the documentation accordingly
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-settings-api.md
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import React, { memo, useMemo, useState } from 'react';
import {
  BackHeader,
  useGlobalContext,
  LeftMenuList,
  LoadingIndicatorPage,
} from 'strapi-helper-plugin';
import { Switch, Redirect, Route, useParams, useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import HeaderSearch from '../../components/HeaderSearch';
import PageTitle from '../../components/PageTitle';
import { useSettingsMenu } from '../../hooks';
import { retrieveGlobalLinks } from '../../utils';
import SettingsSearchHeaderProvider from '../SettingsHeaderSearchContextProvider';
import {
  ApplicationDetailLink,
  MenuWrapper,
  SettingDispatcher,
  StyledLeftMenu,
  Wrapper,
} from './components';

import {
  createRoute,
  createPluginsLinksRoutes,
  makeUniqueRoutes,
  getSectionsToDisplay,
  routes,
} from './utils';

function SettingsPage() {
  const { settingId } = useParams();
  const { goBack } = useHistory();
  const { settingsBaseURL, plugins } = useGlobalContext();
  const [headerSearchState, setShowHeaderSearchState] = useState({ show: false, label: '' });
  const { isLoading, menu } = useSettingsMenu();
  const { formatMessage } = useIntl();
  const pluginsGlobalLinks = useMemo(() => retrieveGlobalLinks(plugins), [plugins]);

  const appRoutes = useMemo(() => {
    return makeUniqueRoutes(
      routes.map(({ to, Component, exact }) => createRoute(Component, to, exact))
    );
  }, []);

  // Create all the <Route /> that needs to be created by the plugins
  // For instance the upload plugin needs to create a <Route />
  const globalSectionCreatedRoutes = useMemo(() => {
    const routesToCreate = pluginsGlobalLinks.map(({ to, Component, exact }) =>
      createRoute(Component, to, exact)
    );

    return makeUniqueRoutes(routesToCreate);
  }, [pluginsGlobalLinks]);

  // Same here for the plugins sections
  const pluginsLinksRoutes = useMemo(() => {
    return createPluginsLinksRoutes(menu);
  }, [menu]);

  // Only display accessible sections
  const filteredMenu = useMemo(() => getSectionsToDisplay(menu), [menu]);

  const toggleHeaderSearch = label =>
    setShowHeaderSearchState(prev => {
      if (prev.show) {
        return {
          show: false,
          label: '',
        };
      }

      return { label, show: true };
    });

  // Since the useSettingsMenu hook can make API calls in order to check the links permissions
  // We need to add a loading state to prevent redirecting the user while permissions are being checked
  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!settingId) {
    return <Redirect to={`${settingsBaseURL}/application-infos`} />;
  }

  const settingTitle = formatMessage({ id: 'app.components.LeftMenuLinkContainer.settings' });

  return (
    <SettingsSearchHeaderProvider value={{ toggleHeaderSearch }}>
      <PageTitle title={settingTitle} />
      <Wrapper>
        <BackHeader onClick={goBack} />

        <div className="row">
          <div className="col-md-3">
            <MenuWrapper>
              <ApplicationDetailLink />
              <StyledLeftMenu>
                {filteredMenu.map(item => {
                  return <LeftMenuList {...item} key={item.id} />;
                })}
              </StyledLeftMenu>
            </MenuWrapper>
          </div>

          <div className="col-md-9">
            <Switch>
              {appRoutes}
              {globalSectionCreatedRoutes}
              {pluginsLinksRoutes}
              <Route path={`${settingsBaseURL}/:pluginId`} component={SettingDispatcher} />
            </Switch>
          </div>
        </div>
        {headerSearchState.show && <HeaderSearch label={headerSearchState.label} />}
      </Wrapper>
    </SettingsSearchHeaderProvider>
  );
}

export default memo(SettingsPage);
