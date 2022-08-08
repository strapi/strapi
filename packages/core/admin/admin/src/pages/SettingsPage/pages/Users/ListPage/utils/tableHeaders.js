import React from 'react';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Status } from '@strapi/helper-plugin';

const tableHeaders = [
  {
    name: 'firstname',
    key: 'firstname',
    metadatas: { label: 'Firstname', sortable: true },
  },
  {
    name: 'lastname',
    key: 'lastname',
    metadatas: { label: 'Lastname', sortable: true },
  },
  {
    key: 'email',
    name: 'email',
    metadatas: { label: 'Email', sortable: true },
  },
  {
    key: 'roles',
    name: 'roles',
    metadatas: { label: 'Roles', sortable: false },
    /* eslint-disable react/prop-types */
    cellFormatter({ roles }, { formatMessage }) {
      return (
        <Typography textColor="neutral800">
          {roles
            .map((role) =>
              formatMessage({
                id: `global.${role.code}`,
                defaultMessage: role.name,
              })
            )
            .join(',\n')}
        </Typography>
      );
    },
    /* eslint-enable react/prop-types */
  },
  {
    key: 'username',
    name: 'username',
    metadatas: { label: 'Username', sortable: true },
  },
  {
    key: 'isActive',
    name: 'isActive',
    metadatas: { label: 'User status', sortable: false },
    // eslint-disable-next-line react/prop-types
    cellFormatter({ isActive }, { formatMessage }) {
      return (
        <Flex>
          <Status isActive={isActive} variant={isActive ? 'success' : 'danger'} />
          <Typography textColor="neutral800">
            {formatMessage({
              id: isActive ? 'global.active' : 'global.inactive',
              defaultMessage: isActive ? 'Active' : 'Inactive',
            })}
          </Typography>
        </Flex>
      );
    },
  },
];

export default tableHeaders;
