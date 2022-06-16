import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import adminPermissions from '../../../../../permissions';
import PageView from '../PageView';

const ProtectedPageView = () => (
  <CheckPagePermissions permissions={adminPermissions.settings.license.main}>
    <PageView />
  </CheckPagePermissions>
);

export default ProtectedPageView;
