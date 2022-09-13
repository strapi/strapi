import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import adminPermissions from '../../../../../permissions';
import ListView from '../ListView';

const ProtectedApiTokenListView = () => (
  <CheckPagePermissions permissions={adminPermissions.settings['api-tokens'].main}>
    <ListView />
  </CheckPagePermissions>
);

export default ProtectedApiTokenListView;
