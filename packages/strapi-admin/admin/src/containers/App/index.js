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

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Switch, Route } from 'react-router-dom';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { LoadingIndicatorPage, request } from 'strapi-helper-plugin';

import { Fonts } from 'buffetjs';

import Admin from '../Admin';
import AuthPage from '../AuthPage';
import NotFoundPage from '../NotFoundPage';
import NotificationProvider from '../NotificationProvider';
import PrivateRoute from '../PrivateRoute';
import Theme from '../Theme';

import { Content, Wrapper } from './components';

import GlobalStyle from '../../components/GlobalStyle';

import { getDataSucceeded } from './actions';

function App(props) {
  const getDataRef = useRef();
  const [state, setState] = useState({ hasAdmin: false, isLoading: true });
  getDataRef.current = props.getDataSucceeded;

  useEffect(() => {
    const getData = async () => {
      try {
        const requestURL = '/users-permissions/init';

        const { hasAdmin } = await request(requestURL, { method: 'GET' });
        const { data } = await request('/admin/init', { method: 'GET' });

        getDataRef.current(hasAdmin, data);
        setState({ hasAdmin, isLoading: false });
      } catch (err) {
        strapi.notification.error('app.containers.App.notification.error.init');
      }
    };

    getData();
  }, [getDataRef]);

  if (state.isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Theme>
      <Wrapper>
        <Fonts />
        <GlobalStyle />
        <NotificationProvider />
        <Content>
          <Switch>
            <Route
              path="/auth/:authType"
              render={routerProps => (
                <AuthPage {...routerProps} hasAdminUser={state.hasAdmin} />
              )}
              exact
            />
            <PrivateRoute path="/" component={Admin} />
            <Route path="" component={NotFoundPage} />
          </Switch>
        </Content>
      </Wrapper>
    </Theme>
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
