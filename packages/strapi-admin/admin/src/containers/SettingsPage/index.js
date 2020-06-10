/**
 *
 * SettingsPage
 *
 */

// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file you also need to update the documentation accordingly
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-settings-api.md
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import React, { memo, useState } from 'react';
import { BackHeader, useGlobalContext, LeftMenuList } from 'strapi-helper-plugin';
import { Switch, Redirect, Route, useParams, useHistory } from 'react-router-dom';
import RolesListPage from 'ee_else_ce/containers/Roles/ListPage';
import RolesCreatePage from 'ee_else_ce/containers/Roles/CreatePage';
import HeaderSearch from '../../components/HeaderSearch';
import { useSettingsMenu } from '../../hooks';
import SettingsSearchHeaderProvider from '../SettingsHeaderSearchContextProvider';
import UsersEditPage from '../Users/EditPage';
import UsersListPage from '../Users/ListPage';
import RolesEditPage from '../Roles/EditPage';
// TODO remove this line when feature finished
// import RolesListPage from '../Roles/ListPage';
import EditView from '../Webhooks/EditView';
import ListView from '../Webhooks/ListView';
import SettingDispatcher from './SettingDispatcher';
import LeftMenu from './StyledLeftMenu';
import Wrapper from './Wrapper';

function SettingsPage() {
  const { settingId } = useParams();
  const { goBack } = useHistory();
  const { settingsBaseURL } = useGlobalContext();
  const [headerSearchState, setShowHeaderSearchState] = useState({ show: false, label: '' });
  const { menu, globalLinks } = useSettingsMenu();

  const createdRoutes = globalLinks
    .map(({ to, Component, exact }) => (
      <Route path={to} key={to} component={Component} exact={exact || false} />
    ))
    .filter((route, index, refArray) => {
      return refArray.findIndex(obj => obj.key === route.key) === index;
    });

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

  // Redirect to the first static link of the menu
  // This is needed in order to keep the menu highlight
  // The link points to /settings instead of /settings/webhooks
  if (!settingId) {
    return <Redirect to={`${settingsBaseURL}/webhooks`} />;
  }

  return (
    <SettingsSearchHeaderProvider value={{ toggleHeaderSearch }}>
      <Wrapper>
        <BackHeader onClick={goBack} />
        {headerSearchState.show && <HeaderSearch label={headerSearchState.label} />}
        <div className="row">
          <div className="col-md-3">
            <LeftMenu>
              {menu.map(item => {
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
              <Route exact path={`${settingsBaseURL}/webhooks`} component={ListView} />
              <Route exact path={`${settingsBaseURL}/webhooks/:id`} component={EditView} />
              {createdRoutes}
              <Route path={`${settingsBaseURL}/:pluginId`} component={SettingDispatcher} />
            </Switch>
          </div>
        </div>
      </Wrapper>
    </SettingsSearchHeaderProvider>
  );
}

export default memo(SettingsPage);
