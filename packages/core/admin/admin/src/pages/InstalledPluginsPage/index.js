import React from 'react';

import { CheckPagePermissions, useAppInfo } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';

import Plugins from './Plugins';

const InstalledPluginsPage = () => {
  const { permissions } = useAppInfo();
  const { formatMessage } = useIntl();
  const title = formatMessage({
    id: 'global.plugins',
    defaultMessage: 'Plugins',
  });

  return (
    <CheckPagePermissions permissions={permissions.marketplace.main}>
      <Helmet title={title} />
      <Plugins />
    </CheckPagePermissions>
  );
};

export default InstalledPluginsPage;
