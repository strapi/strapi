import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../../selectors';
import ListPage from '../ListPage';

const ProtectedListPage = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings.roles.main}>
      <ListPage />
    </CheckPagePermissions>
  );
};

export default ProtectedListPage;
