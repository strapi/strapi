import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import adminPermissions from '../../../../../permissions';
import ListView from '../ListView';

const ProtectedTransferTokenListView = () => (
  <CheckPagePermissions permissions={adminPermissions.settings['transfer-tokens'].main}>
    <ListView />
  </CheckPagePermissions>
);

export default ProtectedTransferTokenListView;
