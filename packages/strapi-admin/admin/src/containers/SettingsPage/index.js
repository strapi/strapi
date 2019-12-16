/**
 *
 * SettingsPage
 *
 */

import React from 'react';
import { LeftMenu, LeftMenuList } from 'strapi-helper-plugin';

import Webhooks from '../Webhooks';
import Wrapper from './Wrapper';

function SettingsPage() {
  const menuItems = [
    {
      title: { id: 'app.components.LeftMenuLinkContainer.general' },
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
                return <LeftMenuList {...item} key={item.title} />;
              })}
            </LeftMenu>
          </div>
          <div className="col-md-9">
            {/* TODO when needed - Routing */}
            <Webhooks />
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

export default SettingsPage;
