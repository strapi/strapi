/**
 *
 * App.js
 *
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Switch, Route } from 'react-router-dom';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { LoadingIndicatorPage, auth, request } from '@strapi/helper-plugin';
import PluginsInitializer from '../../components/PluginsInitializer';
import PrivateRoute from '../../components/PrivateRoute';
import AuthPage from '../AuthPage';
import NotFoundPage from '../NotFoundPage';
import { getUID } from './utils';
import { Content, Wrapper } from './components';
import { getDataSucceeded } from './actions';
import routes from './utils/routes';
import { makeUniqueRoutes, createRoute } from '../SettingsPage/utils';

window.strapi = Object.assign(window.strapi || {}, {
  lockAppWithOverlay: () => console.log('todo unlockAppWithOverlay'),
});

function App(props) {
  const getDataRef = useRef();
  const [{ isLoading, hasAdmin }, setState] = useState({ isLoading: true, hasAdmin: false });
  getDataRef.current = props.getDataSucceeded;

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
        const { data } = await request('/admin/init', { method: 'GET' });

        const { uuid } = data;

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

        getDataRef.current(data);
        setState({ isLoading: false, hasAdmin: data.hasAdmin });
      } catch (err) {
        strapi.notification.toggle({
          type: 'warning',
          message: { id: 'app.containers.App.notification.error.init' },
        });
      }
    };

    getData();
  }, []);

  const setHasAdmin = hasAdmin => setState(prev => ({ ...prev, hasAdmin }));

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
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
          <PrivateRoute path="/" component={PluginsInitializer} />
          <Route path="" component={NotFoundPage} />
        </Switch>
      </Content>
    </Wrapper>
  );
}

App.propTypes = {
  getDataSucceeded: PropTypes.func.isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators({ getDataSucceeded }, dispatch);
}

const withConnect = connect(null, mapDispatchToProps);

export default compose(withConnect)(App);
export { App };
