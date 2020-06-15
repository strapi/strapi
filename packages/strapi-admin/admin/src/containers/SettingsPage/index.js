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
import { get } from 'lodash';
import RolesListPage from 'ee_else_ce/containers/Roles/ListPage';
import RolesCreatePage from 'ee_else_ce/containers/Roles/CreatePage';
import HeaderSearch from '../../components/HeaderSearch';
import { useSettingsMenu } from '../../hooks';
import { retrieveGlobalLinks } from '../../utils';
import SettingsSearchHeaderProvider from '../SettingsHeaderSearchContextProvider';
import UsersEditPage from '../Users/EditPage';
import UsersListPage from '../Users/ListPage';
import RolesEditPage from '../Roles/EditPage';
// TODO remove this line when feature finished
// import RolesListPage from '../Roles/ListPage';
import findFirstAllowedEndpoint from './utils/findFirstAllowedEndpoint';
import WebhooksCreateView from '../Webhooks/ProtectedCreateView';
import WebhooksEditView from '../Webhooks/ProtectedEditView';
import WebhooksListView from '../Webhooks/ProtectedListView';
import SettingDispatcher from './SettingDispatcher';
import LeftMenu from './StyledLeftMenu';
import Wrapper from './Wrapper';

function SettingsPage() {
  const { settingId } = useParams();
  const { goBack } = useHistory();
  const { settingsBaseURL, plugins } = useGlobalContext();
  const [headerSearchState, setShowHeaderSearchState] = useState({ show: false, label: '' });
  const { isLoading, menu } = useSettingsMenu();
  const pluginsGlobalLinks = useMemo(() => retrieveGlobalLinks(plugins), [plugins]);
  const firstAvailableEndpoint = useMemo(() => findFirstAllowedEndpoint(menu), [menu]);

  // Create all the <Route /> that needs to be created by the plugins
  // For instance the upload plugin needs to create a <Route />
  const globalSectionCreatedRoutes = useMemo(
    () =>
      pluginsGlobalLinks
        .map(({ to, Component, exact }) => (
          <Route path={to} key={to} component={Component} exact={exact || false} />
        ))
        .filter((route, index, refArray) => {
          return refArray.findIndex(obj => obj.key === route.key) === index;
        }),
    [pluginsGlobalLinks]
  );

  // Same here for the plugins sections
  const pluginsLinksRoutes = useMemo(() => {
    return menu.reduce((acc, current) => {
      if (current.id === 'global') {
        return acc;
      }

      const currentLinks = get(current, 'links', []);

      const createRoute = (Component, to, exact) => {
        return <Route component={Component} key={to} path={to} exact={exact || false} />;
      };

      const routes = currentLinks
        .filter(link => typeof link.Component === 'function')
        .map(link => {
          return createRoute(link.Component, link.to, link.exact);
        });

      return [...acc, ...routes];
    }, []);
  }, [menu]);

  // Only display accessible sections
  const filteredMenu = useMemo(() => {
    return menu.filter(section => !section.links.every(link => link.isDisplayed === false));
  }, [menu]);

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
    return <Redirect to={firstAvailableEndpoint} />;
  }

  return (
    <SettingsSearchHeaderProvider value={{ toggleHeaderSearch }}>
      <Wrapper>
        <BackHeader onClick={goBack} />
        {headerSearchState.show && <HeaderSearch label={headerSearchState.label} />}
        <div className="row">
          <div className="col-md-3">
            <LeftMenu>
              {filteredMenu.map(item => {
                return <LeftMenuList {...item} key={item.id} />;
              })}
            </LeftMenu>
          </div>
          <div className="col-md-9">
            <Switch>
              <Route exact path={`${settingsBaseURL}/roles`} component={RolesListPage} />
              <Route exact path={`${settingsBaseURL}/roles/new`} component={RolesCreatePage} />
              <Route exact path={`${settingsBaseURL}/roles/:id`} component={RolesEditPage} />
              <Route exact path={`${settingsBaseURL}/users`} component={UsersListPage} />
              <Route exact path={`${settingsBaseURL}/users/:id`} component={UsersEditPage} />

              <Route
                exact
                path={`${settingsBaseURL}/webhooks/create`}
                component={WebhooksCreateView}
              />

              <Route exact path={`${settingsBaseURL}/webhooks/:id`} component={WebhooksEditView} />

              <Route exact path={`${settingsBaseURL}/webhooks`} component={WebhooksListView} />
              {globalSectionCreatedRoutes}
              {pluginsLinksRoutes}
              <Route path={`${settingsBaseURL}/:pluginId`} component={SettingDispatcher} />
            </Switch>
          </div>
        </div>
      </Wrapper>
    </SettingsSearchHeaderProvider>
  );
}

export default memo(SettingsPage);
