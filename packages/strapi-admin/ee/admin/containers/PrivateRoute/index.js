import React, { memo } from 'react';
import { Redirect, Route, useRouteMatch } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import Cookies from 'js-cookie';
import { get } from 'lodash';
import { auth } from 'strapi-helper-plugin';

/* eslint-disable react/jsx-curly-newline */

const PrivateRoute = ({ component: Component, path, ...rest }) => {
  const url = useRouteMatch('/auth/login/:authResponse');
  const authResponse = get(url, ['params', 'authResponse'], null);
  const { formatMessage } = useIntl();

  if (authResponse === 'error') {
    const errorMessage = formatMessage({
      id: 'Auth.form.button.login.providers.error',
      defaultMessage: 'We cannot connect you through the selected provider.',
    });

    return <Redirect to={`/auth/oops?info=${encodeURIComponent(errorMessage)}`} />;
  }

  if (authResponse === 'success' && !auth.getToken()) {
    const jwtToken = Cookies.get('jwtToken');

    if (jwtToken) {
      auth.setToken(jwtToken, false);
      // Ping @soupette 1 : As you can see here, I don't have any user info except the jwtToken
      // so I will need to fetch /admin/users/me to setUserInfo (see ping number 2)
      Cookies.remove('jwtToken');

      return (
        <Redirect
          to={{
            pathname: '/auth/login',
          }}
        />
      );
    }
  }

  return (
    <Route
      path={path}
      render={props =>
        auth.getToken() !== null ? (
          <Component {...rest} {...props} />
        ) : (
          <Redirect
            to={{
              pathname: '/auth/login',
            }}
          />
        )
      }
    />
  );
};

PrivateRoute.propTypes = {
  component: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
  path: PropTypes.string.isRequired,
};

export default memo(PrivateRoute);
