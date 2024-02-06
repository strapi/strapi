import * as React from 'react';

import { Layout as DSLayout } from '@strapi/design-system';
import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Navigate, Outlet, useMatch } from 'react-router-dom';

import { useSettingsMenu } from '../../hooks/useSettingsMenu';

import { SettingsNav } from './components/SettingsNav';

const Layout = () => {
  /**
   * This ensures we're capturing the settingId from the URL
   * but also lets any nesting after that pass.
   */
  const match = useMatch('/settings/:settingId/*');
  const { formatMessage } = useIntl();
  const { isLoading, menu } = useSettingsMenu();

  // Since the useSettingsMenu hook can make API calls in order to check the links permissions
  // We need to add a loading state to prevent redirecting the user while permissions are being checked
  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!match?.params.settingId) {
    return <Navigate to="application-infos" />;
  }

  return (
    <DSLayout sideNav={<SettingsNav menu={menu} />}>
      <Helmet
        title={formatMessage({
          id: 'global.settings',
          defaultMessage: 'Settings',
        })}
      />
      <Outlet />
    </DSLayout>
  );
};

export { Layout };
