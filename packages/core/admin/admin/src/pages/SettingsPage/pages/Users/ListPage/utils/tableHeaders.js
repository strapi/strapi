import React from 'react';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
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
    cellFormatter: ({ roles }) => {
      return <Text textColor="neutral800">{roles.map(role => role.name).join(',\n')}</Text>;
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
    metadatas: { label: 'Active User', sortable: false },
    // eslint-disable-next-line react/prop-types
    cellFormatter: ({ isActive }) => {
      return (
        <Row>
          <Status isActive={isActive} variant={isActive ? 'success' : 'danger'} />
          <Text textColor="neutral800">{isActive ? 'Active' : 'Inactive'}</Text>
        </Row>
      );
    },
  },
];

export default tableHeaders;
