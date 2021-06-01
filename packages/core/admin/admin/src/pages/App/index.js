/**
 *
 * App.js
 *
 */

import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { Switch, Route } from 'react-router-dom';
import {
  LoadingIndicatorPage,
  auth,
  request,
  useNotification,
  TrackingContext,
} from '@strapi/helper-plugin';
import PrivateRoute from '../../components/PrivateRoute';
import AuthPage from '../AuthPage';
import NotFoundPage from '../NotFoundPage';
import { getUID } from './utils';
import { Content, Wrapper } from './components';
import routes from './utils/routes';
import { makeUniqueRoutes, createRoute } from '../SettingsPage/utils';

const AuthenticatedApp = lazy(() =>
  import(/* webpackChunkName: "Admin-authenticatedApp" */ '../../components/AuthenticatedApp')
);

function App() {
  const toggleNotification = useNotification();
  const [{ isLoading, hasAdmin, uuid }, setState] = useState({ isLoading: true, hasAdmin: false });

  const authRoutes = useMemo(() => {
    return makeUniqueRoutes(
      routes.map(({ to, Component, exact }) => createRoute(Component, to, exact))
    );
  }, []);

  useEffect(() => {
    const currentToken = auth.getToken();

    const renewToken = async () => {
      try {
        const {
          data: { token },
        } = await request('/admin/renew-token', {
          method: 'POST',
          body: { token: currentToken },
        });
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
  }, []);

  useEffect(() => {
    const getData = async () => {
      try {
        const {
          data: { hasAdmin, uuid },
        } = await request('/admin/init', { method: 'GET' });

        if (uuid) {
          try {
            const deviceId = await getUID();

            fetch('https://analytics.strapi.io/track', {
              method: 'POST',
              body: JSON.stringify({
                event: 'didInitializeAdministration',
                uuid,
                deviceId,
              }),
              headers: {
                'Content-Type': 'application/json',
              },
            });
          } catch (e) {
            // Silent.
          }
        }

        setState({ isLoading: false, hasAdmin, uuid });
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: 'app.containers.App.notification.error.init' },
        });
      }
    };

    getData();
  }, [toggleNotification]);

  const setHasAdmin = hasAdmin => setState(prev => ({ ...prev, hasAdmin }));

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Suspense fallback={<LoadingIndicatorPage />}>
      <TrackingContext.Provider value={uuid}>
        <Wrapper>
          <Content>
            <Switch>
              {authRoutes}
              <Route
                path="/auth/:authType"
                render={routerProps => (
                  <AuthPage {...routerProps} setHasAdmin={setHasAdmin} hasAdmin={hasAdmin} />
                )}
                exact
              />
              <PrivateRoute path="/" component={AuthenticatedApp} />
              <Route path="" component={NotFoundPage} />
            </Switch>
          </Content>
        </Wrapper>
      </TrackingContext.Provider>
    </Suspense>
  );
}

export default App;
