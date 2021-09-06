import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import adminPermissions from '../../../../../permissions';
import EditView from '../EditView';

const ProtectedEditView = () => (
  <CheckPagePermissions permissions={adminPermissions.settings.webhooks.update}>
    <EditView />
  </CheckPagePermissions>
);

export default ProtectedEditView;
