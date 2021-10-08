import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import adminPermissions from '../../../../../permissions';
import CreateView from '../CreateView';

const ProtectedApiTokenCreateView = () => {
  return (
    <CheckPagePermissions permissions={adminPermissions.settings['api-tokens'].create}>
      <CreateView />
    </CheckPagePermissions>
  );
};

export default ProtectedApiTokenCreateView;
