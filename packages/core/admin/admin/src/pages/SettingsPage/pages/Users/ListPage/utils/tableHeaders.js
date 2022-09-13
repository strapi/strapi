import React from 'react';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Status } from '@strapi/helper-plugin';

const tableHeaders = [
  {
    name: 'firstname',
    key: 'firstname',
    metadatas: {
      label: {
        id: 'Settings.permissions.users.firstname',
        defaultMessage: 'Firstname',
      },
      sortable: true,
    },
  },
  {
    name: 'lastname',
    key: 'lastname',
    metadatas: {
      label: {
        id: 'Settings.permissions.users.lastname',
        defaultMessage: 'Lastname',
      },
      sortable: true,
    },
  },
  {
    key: 'email',
    name: 'email',
    metadatas: {
      label: { id: 'Settings.permissions.users.email', defaultMessage: 'Email' },
      sortable: true,
    },
  },
  {
    key: 'roles',
    name: 'roles',
    metadatas: {
      label: {
        id: 'Settings.permissions.users.roles',
        defaultMessage: 'Roles',
      },
      sortable: false,
    },
    cellFormatter({ roles }, { formatMessage }) {
      return (
        <Typography textColor="neutral800">
          {roles
            .map((role) =>
              formatMessage({
                id: `Settings.permissions.users.${role.code}`,
                defaultMessage: role.name,
              })
            )
            .join(',\n')}
        </Typography>
      );
    },
  },
  {
    key: 'username',
    name: 'username',
    metadatas: {
      label: {
        id: 'Settings.permissions.users.username',
        defaultMessage: 'Username',
      },
      sortable: true,
    },
  },
  {
    key: 'isActive',
    name: 'isActive',
    metadatas: {
      label: {
        id: 'Settings.permissions.users.user-status',
        defaultMessage: 'User status',
      },
      sortable: false,
    },
    cellFormatter({ isActive }, { formatMessage }) {
      return (
        <Flex>
          <Status isActive={isActive} variant={isActive ? 'success' : 'danger'} />
          <Typography textColor="neutral800">
            {formatMessage({
              id: isActive
                ? 'Settings.permissions.users.active'
                : 'Settings.permissions.users.inactive',
              defaultMessage: isActive ? 'Active' : 'Inactive',
            })}
          </Typography>
        </Flex>
      );
    },
  },
];

export default tableHeaders;
