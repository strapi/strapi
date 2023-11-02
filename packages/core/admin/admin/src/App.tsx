/**
 *
 * App.js
 *
 */

import * as React from 'react';

import { SkipToContent } from '@strapi/design-system';
import {
  auth,
  LoadingIndicatorPage,
  MenuItem,
  prefixFileUrlWithBackendUrl,
  TrackingProvider,
  useAppInfo,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import merge from 'lodash/merge';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Route, Switch } from 'react-router-dom';

import { PrivateRoute } from './components/PrivateRoute';
import { ADMIN_PERMISSIONS_CE, ACTION_SET_ADMIN_PERMISSIONS } from './constants';
import { useConfiguration } from './contexts/configuration';
import { useEnterprise } from './hooks/useEnterprise';
// @ts-expect-error not converted yet
import AuthPage from './pages/AuthPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UseCasePage } from './pages/UseCasePage';
import { createRoute } from './utils/createRoute';

type StrapiRoute = Pick<MenuItem, 'exact' | 'to'> & Required<Pick<MenuItem, 'Component'>>;

const ROUTES_CE: StrapiRoute[] | null = null;

const AuthenticatedApp = React.lazy(() =>
  import('./components/AuthenticatedApp').then((mod) => ({ default: mod.AuthenticatedApp }))
);

export const App = () => {
  const adminPermissions = useEnterprise(
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
  const routes = useEnterprise<StrapiRoute[] | null, StrapiRoute[], StrapiRoute[]>(
    ROUTES_CE,
    async () => (await import('../../ee/admin/src/constants')).ROUTES_EE,
    {
      defaultValue: [],
    }
  );
  const toggleNotification = useNotification();
  const { updateProjectSettings } = useConfiguration();
  const { formatMessage } = useIntl();
  const [{ isLoading, hasAdmin, uuid, deviceId }, setState] = React.useState({
    isLoading: true,
    deviceId: undefined,
    hasAdmin: false,
    uuid: false,
  });
  const dispatch = useDispatch();
  const appInfo = useAppInfo();
  const { get, post } = useFetchClient();

  const authRoutes = React.useMemo(() => {
    if (!routes) {
      return null;
    }

    return routes.map(({ to, Component, exact }) => createRoute(Component, to, exact));
  }, [routes]);

  const [telemetryProperties, setTelemetryProperties] = React.useState(undefined);

  React.useEffect(() => {
    dispatch({ type: ACTION_SET_ADMIN_PERMISSIONS, payload: adminPermissions });
  }, [adminPermissions, dispatch]);

  React.useEffect(() => {
    const currentToken = auth.getToken();

    const renewToken = async () => {
      try {
        const {
          data: {
            data: { token },
          },
        } = await post('/admin/renew-token', { token: currentToken });
        auth.updateToken(token);
      } catch (err) {
        // Refresh app
        auth.clearAppStorage();
        window.location.reload();
      }
    };

    if (currentToken) {
      renewToken();
    }
  }, [post]);

  React.useEffect(() => {
    const getData = async () => {
      try {
        const {
          data: {
            data: { hasAdmin, uuid, menuLogo, authLogo },
          },
        } = await get(`/admin/init`);

        updateProjectSettings({
          menuLogo: prefixFileUrlWithBackendUrl(menuLogo),
          authLogo: prefixFileUrlWithBackendUrl(authLogo),
        });

        if (uuid) {
          const {
            data: { data: properties },
          } = await get(`/admin/telemetry-properties`, {
            // NOTE: needed because the interceptors of the fetchClient redirect to /login when receive a 401 and it would end up in an infinite loop when the user doesn't have a session.
            validateStatus: (status) => status < 500,
          });

          setTelemetryProperties(properties);

          try {
            const event = 'didInitializeAdministration';
            await post(
              'https://analytics.strapi.io/api/v2/track',
              {
                // This event is anonymous
                event,
                userId: '',
                deviceId,
                eventPropeties: {},
                userProperties: { environment: appInfo.currentEnvironment },
                groupProperties: { ...properties, projectId: uuid },
              },
              {
                headers: {
                  'X-Strapi-Event': event,
                },
              }
            );
          } catch (e) {
            // Silent.
          }
        }

        setState({ isLoading: false, hasAdmin, uuid, deviceId });
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: 'app.containers.App.notification.error.init' },
        });
      }
    };

    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleNotification, updateProjectSettings]);

  const setHasAdmin = (hasAdmin: boolean) => setState((prev) => ({ ...prev, hasAdmin }));

  const trackingInfo = React.useMemo(
    () => ({
      uuid,
      telemetryProperties,
      deviceId,
    }),
    [uuid, telemetryProperties, deviceId]
  );

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <React.Suspense fallback={<LoadingIndicatorPage />}>
      <SkipToContent>
        {formatMessage({ id: 'skipToContent', defaultMessage: 'Skip to content' })}
      </SkipToContent>
      <TrackingProvider value={trackingInfo}>
        <Switch>
          {authRoutes}
          <Route
            path="/auth/:authType"
            render={(routerProps) => (
              <AuthPage {...routerProps} setHasAdmin={setHasAdmin} hasAdmin={hasAdmin} />
            )}
            exact
          />
          <PrivateRoute path="/usecase" component={UseCasePage} />
          <PrivateRoute path="/" component={AuthenticatedApp} />
          <Route path="" component={NotFoundPage} />
        </Switch>
      </TrackingProvider>
    </React.Suspense>
  );
};
