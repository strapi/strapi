import React from 'react';
import { Cog } from '@strapi/icons';
import Item from '../Item';
import { useCommand } from '../context';

const links = [
  {
    name: 'Api Tokens',
    to: '/api-tokens',
  },
  {
    name: 'Media Library',
    to: '/media-library',
  },
  {
    name: 'Transfer tokens',
    to: '/transfer-tokens',
  },
  {
    name: 'Webhooks',
    to: '/webhooks',
  },
  {
    name: 'Roles',
    to: '/roles',
  },
  {
    name: 'Users',
    to: '/users',
  },
];

const Settings = () => {
  const { page, goTo } = useCommand();

  const displayOnSearchOnly = page !== 'settings';

  return (
    <>
      {links.map(({ name, to }) => {
        const label = `Go to ${name} settings`;

        return (
          <Item
            displayOnSearchOnly={displayOnSearchOnly}
            onSelect={() => goTo(`/settings${to}`)}
            value={label}
          >
            <Cog /> {label}
          </Item>
        );
      })}
    </>
  );
};

export default Settings;
