/**
 *
 * SettingsPage
 *
 */

import React, { Suspense, lazy } from 'react';
import {
  useGlobalContext,
  LeftMenu,
  LeftMenuList,
  LoadingIndicatorPage,
} from 'strapi-helper-plugin';
import { get } from 'lodash';
import { Switch, Route } from 'react-router-dom';

const EditView = lazy(() => import('../Webhooks/EditView'));
const ListView = lazy(() => import('../Webhooks/ListView'));
const Wrapper = lazy(() => import('./Wrapper'));

function SettingsPage() {
  const { formatMessage, plugins } = useGlobalContext();
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
          to: '/settings/webhooks',
          name: 'webhooks',
        },
      ],
    },
    ...pluginsMenu,
  ];

  return (
    <Suspense fallback={<LoadingIndicatorPage />}>
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
            {/* TODO when needed - Routing */}
            {/* <Webhooks /> */}
            <Switch>
              <Route exact path="/settings/webhooks" component={ListView} />
              <Route exact path="/settings/webhooks/:id" component={EditView} />
            </Switch>
          </div>
        </div>
      </Wrapper>
    </Suspense>
  );
}

export default SettingsPage;
