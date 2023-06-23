import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../App/selectors';
import ListView from '../ListView';

const ProtectedApiTokenListView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings['api-tokens'].main}>
      <ListView />
    </CheckPagePermissions>
  );
};

export default ProtectedApiTokenListView;
