/**
 *
 * SettingsPage
 *
 */

import React from 'react';
import { Redirect, Route, Switch, useRouteMatch } from 'react-router-dom';
import { LeftMenu, LeftMenuList } from 'strapi-helper-plugin';

import Webhooks from '../Webhooks';
import Wrapper from './Wrapper';

function SettingsPage() {
  let { path } = useRouteMatch();
  const renderSettings = props => <Webhooks {...props} />;

  const menuItems = [
    {
      name: 'General',
      searchable: false,
      links: [
        {
          title: 'webhooks',
          to: '/settings/webhooks',
          name: 'webhooks',
        },
      ],
    },
  ];

  return (
    <Wrapper>
      <div className="container">
        <div className="row">
          <div className="col-md-3">
            <LeftMenu>
              {menuItems.map(item => {
                return <LeftMenuList {...item} key={item.name} />;
              })}
            </LeftMenu>
          </div>
          <div className="col-md-9">
            <Switch>
              <Redirect exact from={`${path}`} to={`${path}/webhooks`} />
              <Route
                exact
                path={`${path}/webhooks`}
                render={renderSettings}
              ></Route>
            </Switch>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

export default SettingsPage;
