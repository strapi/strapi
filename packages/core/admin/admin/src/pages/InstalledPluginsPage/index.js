import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../App/selectors';

import Plugins from './Plugins';

const InstalledPluginsPage = () => {
  const { formatMessage } = useIntl();
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.marketplace.main}>
      <Helmet
        title={formatMessage({
          id: 'global.plugins',
          defaultMessage: 'Plugins',
        })}
      />
      <Plugins />
    </CheckPagePermissions>
  );
};

export default InstalledPluginsPage;
