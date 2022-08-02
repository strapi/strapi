import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import adminPermissions from '../../permissions';
import Plugins from './Plugins';

const InstalledPluginsPage = () => {
  const { formatMessage } = useIntl();
  const title = formatMessage({
    id: 'global.plugins',
    defaultMessage: 'Plugins',
  });

  return (
    <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
      <Helmet title={title} />
      <Plugins />
    </CheckPagePermissions>
  );
};

export default InstalledPluginsPage;
