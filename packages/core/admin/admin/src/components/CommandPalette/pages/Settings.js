import React, { useMemo } from 'react';
import { Cog } from '@strapi/icons';
import Items from '../Items';
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
  const { page } = useCommand();

  const items = useMemo(() => {
    return links.map(({ name, to }) => {
      return {
        icon: Cog,
        label: `Go to ${name} settings`,
        action({ goTo }) {
          goTo(`/settings${to}`);
        },
      };
    });
  }, []);

  return <Items items={items} displayOnSearchOnly={page !== 'settings'} />;
};

export default Settings;
