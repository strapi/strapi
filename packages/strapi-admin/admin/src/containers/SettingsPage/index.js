/**
 *
 * SettingsPage
 *
 */

import React from 'react';
import { useGlobalContext, LeftMenu, LeftMenuList } from 'strapi-helper-plugin';

import Webhooks from '../Webhooks';
import Wrapper from './Wrapper';

function SettingsPage() {
  const { formatMessage } = useGlobalContext();

  const menuItems = [
    {
      title: { id: 'Settings.global' },
      links: [
        {
          title: formatMessage({ id: 'Settings.webhooks.title' }),
          to: '/settings/webhooks',
          name: 'webhooks',
        },
      ],
    },
  ];

  return (
    <Wrapper>
      <div className="row">
        <div className="col-md-3">
          <LeftMenu>
            {menuItems.map(item => {
              return <LeftMenuList {...item} key={item.title.id} />;
            })}
          </LeftMenu>
        </div>
        <div className="col-md-9">
          {/* TODO when needed - Routing */}
          <Webhooks />
        </div>
      </div>
    </Wrapper>
  );
}

export default SettingsPage;
