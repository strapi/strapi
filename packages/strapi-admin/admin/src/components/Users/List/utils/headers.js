import React from 'react';
import ActiveStatus from '../ActiveStatus';

const headers = [
  {
    cellFormatter: (cellData, rowData) => {
      return `${cellData} ${rowData.lastname}`;
    },
    name: 'name',
    value: 'firstname',
  },
  {
    name: 'email',
    value: 'email',
  },
  {
    cellFormatter: cellData => cellData.join(',\n'),
    name: 'roles',
    value: 'roles',
  },
  {
    name: 'username',
    value: 'username',
  },
  {
    // eslint-disable-next-line react/prop-types
    cellAdapter: ({ isActive }) => {
      return (
        <>
          <ActiveStatus isActive={isActive}>{isActive ? 'Active' : 'Inactive'}</ActiveStatus>
        </>
      );
    },
    name: 'active user',
    value: 'isActive',
  },
];

export default headers;
