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
import PropTypes from 'prop-types';
import { Switch, Route } from 'react-router-dom';
// From strapi-helper-plugin
import LoadingIndicatorPage from 'components/LoadingIndicatorPage';

import '../../styles/main.scss';

import NotFoundPage from '../NotFoundPage';
import NotificationProvider from '../NotificationProvider';
import AppLoader from '../AppLoader';
import Admin from '../Admin';

import styles from './styles.scss';

export class App extends React.Component { // eslint-disable-line react/prefer-stateless-function
  renderAdmin = props => <Admin {...this.props} {...props} />;

  render() {
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
                  <Route path="/" render={this.renderAdmin} />
                  <Route path="" component={NotFoundPage} />
                </Switch>
              </div>
            );
          }}
        </AppLoader>
      </div>
    );
  }
}

App.contextTypes = {
  router: PropTypes.object,
};

App.propTypes = {};

export default App;
