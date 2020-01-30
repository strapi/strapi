/**
 *
 * SettingsPage
 *
 */

import React, { memo } from 'react';
import { useGlobalContext, LeftMenu, LeftMenuList } from 'strapi-helper-plugin';
import { get } from 'lodash';
import { Switch, Redirect, Route, useParams } from 'react-router-dom';

import EditView from '../Webhooks/EditView';
import ListView from '../Webhooks/ListView';
import SettingDispatcher from './SettingDispatcher';
import Wrapper from './Wrapper';

function SettingsPage() {
  const { settingId } = useParams();
  const { formatMessage, plugins, settingsBaseURL } = useGlobalContext();

  const pluginsMenu = Object.keys(plugins).reduce((acc, current) => {
    const pluginMenu = get(plugins, [current, 'settings', 'menuSection'], null);

    if (!pluginMenu) {
      return acc;
    }

    acc.push(pluginMenu);

    return acc;
  }, []);

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
            <Route
              exact
              path={`${settingsBaseURL}/webhooks`}
              component={ListView}
            />
            <Route
              exact
              path={`${settingsBaseURL}/webhooks/:id`}
              component={EditView}
            />
            <Route
              path={`${settingsBaseURL}/:pluginId`}
              component={SettingDispatcher}
            />
          </Switch>
        </div>
      </div>
    </Wrapper>
  );
}

export default memo(SettingsPage);
