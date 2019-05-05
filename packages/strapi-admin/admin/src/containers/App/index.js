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

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';

import Admin from '../Admin';
import NotFoundPage from '../NotFoundPage';
import NotificationProvider from '../NotificationProvider';
import AppLoader from '../AppLoader';
import styles from './styles.scss';

function App(props) {
  return (
    <div>
      <NotificationProvider />
      <AppLoader>
        {({ shouldLoad }) => {
          if (shouldLoad) {
            return <LoadingIndicatorPage />;
          }

          return (
            <div className={styles.container}>
              <Switch>
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

App.propTypes = {};

export default App;
