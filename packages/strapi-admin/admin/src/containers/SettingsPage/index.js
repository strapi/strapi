/**
 *
 * SettingsPage
 *
 */

// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file you also need to update the documentation accordingly
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-settings-api.md
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import React, { memo } from 'react';
import { useGlobalContext, LeftMenuList } from 'strapi-helper-plugin';
import { Switch, Redirect, Route, useParams } from 'react-router-dom';
import RolesListPage from '../Roles/ListPage';
import RolesCreatePage from '../Roles/CreatePage';
import RolesEditPage from '../Roles/EditPage';
import UsersEditPage from '../Users/EditPage';
import UsersListPage from '../Users/ListPage';
import EditView from '../Webhooks/EditView';
import ListView from '../Webhooks/ListView';
import SettingDispatcher from './SettingDispatcher';
import LeftMenu from './StyledLeftMenu';
import Wrapper from './Wrapper';
import retrieveGlobalLinks from './utils/retrieveGlobalLinks';
import retrievePluginsMenu from './utils/retrievePluginsMenu';

function SettingsPage() {
  const { settingId } = useParams();
  const { formatMessage, plugins, settingsBaseURL } = useGlobalContext();
  // Retrieve the links that will be injected into the global section
  const globalLinks = retrieveGlobalLinks(plugins);
  // Create the plugins settings section
  // Note it is currently not possible to add a link into a plugin section
  const pluginsMenu = retrievePluginsMenu(plugins);

  const createdRoutes = globalLinks
    .map(({ to, Component, exact }) => (
      <Route path={to} key={to} component={Component} exact={exact || false} />
    ))
    .filter((route, index, refArray) => {
      return refArray.findIndex(obj => obj.key === route.key) === index;
    });

  const menuItems = [
    {
      id: 'global',
      title: { id: 'Settings.global' },
      links: [
        {
          title: formatMessage({ id: 'Settings.webhooks.title' }),
          to: `${settingsBaseURL}/webhooks`,
          name: 'webhooks',
        },
        ...globalLinks,
      ],
    },
    {
      id: 'permissions',
      title: 'Settings.permissions',
      links: [
        {
          title: formatMessage({ id: 'Settings.permissions.menu.link.roles.label' }),
          to: `${settingsBaseURL}/roles`,
          name: 'roles',
        },
        {
          title: formatMessage({ id: 'Settings.permissions.menu.link.users.label' }),
          to: `${settingsBaseURL}/users`,
          name: 'users',
        },
      ],
    },
    ...pluginsMenu,
  ];

  // Redirect to the first static link of the menu
  // This is needed in order to keep the menu highlight
  // The link points to /settings instead of /settings/webhooks
  if (!settingId) {
    return <Redirect to={`${settingsBaseURL}/webhooks`} />;
  }

  return (
    <Wrapper>
      <div className="row">
        <div className="col-md-3">
          <LeftMenu>
            {menuItems.map(item => {
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
  );
}

export default memo(SettingsPage);
