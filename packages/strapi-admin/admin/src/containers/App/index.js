/**
 *
 * App.js
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 * NOTE: while this component should technically be a stateless functional
 * component (SFC), hot reloading does not currently support SFCs. If hot
 * reloading is not a neccessity for you then you can refactor it and remove
 * the linting exception.
 */

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Switch, Route } from 'react-router-dom';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { LoadingIndicatorPage, request } from 'strapi-helper-plugin';

import Admin from '../Admin';
import NotFoundPage from '../NotFoundPage';
import NotificationProvider from '../NotificationProvider';
import AppLoader from '../AppLoader';
import styles from './styles.scss';
import AuthPage from '../AuthPage';

import { getDataSucceeded } from './actions';

function App(props) {
  const getDataRef = useRef();
  getDataRef.current = props.getDataSucceeded;

  useEffect(() => {
    const getData = async () => {
      try {
        const requestURL = '/users-permissions/init';

        const { hasAdmin } = await request(requestURL, { method: 'GET' });
        getDataRef.current(hasAdmin);
      } catch (err) {
        strapi.notification.error('app.containers.App.notification.error.init');
      }
    };

    getData();
  }, [getDataRef]);

  return (
    <div>
      <NotificationProvider />
      <AppLoader>
        {({ hasAdminUser, shouldLoad }) => {
          if (shouldLoad) {
            return <LoadingIndicatorPage />;
          }

          return (
            <div className={styles.container}>
              <Switch>
                <Route
                  path="/auth/:authType"
                  render={routerProps => (
                    <AuthPage
                      {...props}
                      {...routerProps}
                      hasAdminUser={hasAdminUser}
                    />
                  )}
                  exact
                />
                <Route
                  path="/"
                  render={router => <Admin {...props} {...router} />}
                />
                <Route path="" component={NotFoundPage} />
              </Switch>
            </div>
          );
        }}
      </AppLoader>
    </div>
  );
}

App.propTypes = {
  getDataSucceeded: PropTypes.func.isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators({ getDataSucceeded }, dispatch);
}

const withConnect = connect(
  null,
  mapDispatchToProps
);

export default compose(withConnect)(App);
export { App };
