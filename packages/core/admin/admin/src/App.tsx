/**
 *
 * App.js
 *
 */

import * as React from 'react';

import { SkipToContent } from '@strapi/design-system';
import { useNotification } from '@strapi/helper-plugin';
import merge from 'lodash/merge';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Outlet } from 'react-router-dom';

import { Page } from './components/PageHelpers';
import { ADMIN_PERMISSIONS_CE } from './constants';
import { ConfigurationProvider, ConfigurationProviderProps } from './features/Configuration';
import { TrackingProvider } from './features/Tracking';
import { useEnterprise } from './hooks/useEnterprise';
import { setAdminPermissions } from './reducer';
import { useInitQuery } from './services/admin';
import { PermissionMap } from './types/permissions';

interface AppProps extends Omit<ConfigurationProviderProps, 'children' | 'authLogo' | 'menuLogo'> {
  authLogo: string;
  menuLogo: string;
}

export const App = ({ authLogo, menuLogo, showReleaseNotification, showTutorials }: AppProps) => {
  // @ts-expect-error – we need to type the useEnterprise hook better, in this circumstance we know it'll either be the CE data or a merge of the two.
  const adminPermissions: Partial<PermissionMap> = useEnterprise(
    ADMIN_PERMISSIONS_CE,
    async () => (await import('../../ee/admin/src/constants')).ADMIN_PERMISSIONS_EE,
    {
      combine(cePermissions, eePermissions) {
        // the `settings` NS e.g. are deep nested objects, that need a deep merge
        return merge({}, cePermissions, eePermissions);
      },

      defaultValue: ADMIN_PERMISSIONS_CE,
    }
  );

  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();

  React.useEffect(() => {
    dispatch(setAdminPermissions(adminPermissions));
  }, [adminPermissions, dispatch]);

  const { data, error, isLoading } = useInitQuery();
  const { authLogo: customAuthLogo, menuLogo: customMenuLogo } = data ?? {};

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'warning',
        message: { id: 'app.containers.App.notification.error.init' },
      });
    }
  }, [error, toggleNotification]);

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <React.Suspense fallback={<Page.Loading />}>
      <SkipToContent>
        {formatMessage({ id: 'skipToContent', defaultMessage: 'Skip to content' })}
      </SkipToContent>
      <ConfigurationProvider
        authLogo={{
          default: authLogo,
          custom: {
            url: customAuthLogo ?? '',
          },
        }}
        menuLogo={{
          default: menuLogo,
          custom: {
            url: customMenuLogo ?? '',
          },
        }}
        showReleaseNotification={showReleaseNotification}
        showTutorials={showTutorials}
      >
        <TrackingProvider>
          <Outlet />
        </TrackingProvider>
      </ConfigurationProvider>
    </React.Suspense>
  );
};
