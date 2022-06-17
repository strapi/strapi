/**
 *
 * PrivateRoute
 * Higher Order Component that blocks navigation when the user is not logged in
 * and redirect the user to login page
 *
 * Wrap your protected routes to secure your container
 */

import React, { memo } from 'react';
import { Redirect, Route, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { auth } from '@strapi/helper-plugin';

/* eslint-disable react/jsx-curly-newline */

const PrivateRoute = ({ component: Component, path, ...rest }) => {
  const { pathname, search } = useLocation();

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
              search:
                pathname !== '/' && `?redirectTo=${encodeURIComponent(`${pathname}${search}`)}`,
            }}
          />
        )
      }
    />
  );
};

PrivateRoute.propTypes = {
  component: PropTypes.any.isRequired,
  path: PropTypes.string.isRequired,
};

export default memo(PrivateRoute);
