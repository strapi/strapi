/**
 *
 * App.js
 *
 */

import * as React from 'react';

import { SkipToContent } from '@strapi/design-system';
import {
  LoadingIndicatorPage,
  MenuItem,
  TrackingProvider,
  useAppInfo,
  useNotification,
} from '@strapi/helper-plugin';
import merge from 'lodash/merge';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Route, Switch } from 'react-router-dom';

import { PrivateRoute } from './components/PrivateRoute';
import { ADMIN_PERMISSIONS_CE } from './constants';
import { useAuth } from './features/Auth';
import { ConfigurationProvider, ConfigurationProviderProps } from './features/Configuration';
import { useEnterprise } from './hooks/useEnterprise';
import { AuthPage } from './pages/Auth/AuthPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UseCasePage } from './pages/UseCasePage';
import { setAdminPermissions } from './reducer';
import { useInitQuery, useTelemetryPropertiesQuery } from './services/admin';
import { PermissionMap } from './types/permissions';
import { createRoute } from './utils/createRoute';

type StrapiRoute = Pick<MenuItem, 'exact' | 'to'> & Required<Pick<MenuItem, 'Component'>>;

const ROUTES_CE: StrapiRoute[] | null = null;

const AuthenticatedApp = React.lazy(() =>
  import('./components/AuthenticatedApp').then((mod) => ({ default: mod.AuthenticatedApp }))
);

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
  const routes = useEnterprise(
    ROUTES_CE,
    async () => (await import('../../ee/admin/src/constants')).ROUTES_EE,
    {
      defaultValue: [],
    }
  );
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const appInfo = useAppInfo();
  const token = useAuth('App', (state) => state.token);

  const authRoutes = React.useMemo(() => {
    if (!routes) {
      return null;
    }

    return routes.map(({ to, Component, exact }) => createRoute(Component, to, exact));
  }, [routes]);

  React.useEffect(() => {
    dispatch(setAdminPermissions(adminPermissions));
  }, [adminPermissions, dispatch]);

  const initQuery = useInitQuery();
  const {
    hasAdmin,
    uuid,
    authLogo: customAuthLogo,
    menuLogo: customMenuLogo,
  } = initQuery.data ?? {};

  const telemetryPropertiesQuery = useTelemetryPropertiesQuery(undefined, {
    skip: !uuid || !token,
  });

  React.useEffect(() => {
    if (initQuery.error) {
      toggleNotification({
        type: 'warning',
        message: { id: 'app.containers.App.notification.error.init' },
      });
    }
  }, [initQuery.error, toggleNotification]);

  React.useEffect(() => {
    if (uuid && appInfo.currentEnvironment && telemetryPropertiesQuery.data) {
      const event = 'didInitializeAdministration';
      /**
       * fetch doesn't throw so it doesn't need to be in a try/catch.
       */
      fetch('https://analytics.strapi.io/api/v2/track', {
        method: 'POST',
        body: JSON.stringify({
          // This event is anonymous
          event,
          userId: '',
          eventPropeties: {},
          userProperties: { environment: appInfo.currentEnvironment },
          groupProperties: { ...telemetryPropertiesQuery.data, projectId: uuid },
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Strapi-Event': event,
        },
      });
    }
  }, [appInfo.currentEnvironment, telemetryPropertiesQuery.data, uuid]);

  const trackingInfo = React.useMemo(
    () => ({
      uuid,
      telemetryProperties: telemetryPropertiesQuery.data,
    }),
    [uuid, telemetryPropertiesQuery.data]
  );

  if (initQuery.isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <React.Suspense fallback={<LoadingIndicatorPage />}>
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
        <TrackingProvider value={trackingInfo}>
          <Switch>
            {authRoutes}
            <Route
              path="/auth/:authType"
              render={(routerProps) => <AuthPage {...routerProps} hasAdmin={Boolean(hasAdmin)} />}
              exact
            />
            <PrivateRoute path="/usecase">
              <UseCasePage />
            </PrivateRoute>
            <PrivateRoute path="/">
              <AuthenticatedApp />
            </PrivateRoute>
            <Route path="" component={NotFoundPage} />
          </Switch>
        </TrackingProvider>
      </ConfigurationProvider>
    </React.Suspense>
  );
};
