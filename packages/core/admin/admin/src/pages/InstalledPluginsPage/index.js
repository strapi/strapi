import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';

import adminPermissions from '../../permissions';
import Plugins from './Plugins';

const InstalledPluginsPage = () => {
  return (
    <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
      <Plugins />
    </CheckPagePermissions>
  );
};

export default InstalledPluginsPage;
