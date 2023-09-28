/**
 *
 * RequireAuth
 * Higher Order Component that blocks navigation when the user is not logged in
 * and redirect the user to login page
 *
 * Wrap your protected routes to secure your container
 *
 * Inspired by https://gist.github.com/mjackson/d54b40a094277b7afdd6b81f51a0393f
 */

import React, { memo } from 'react';

import { auth } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';

/* eslint-disable react/jsx-curly-newline */

const RequireAuth = ({ children }) => {
  const { pathname, search } = useLocation();

  return auth.getToken() !== null ? (
    children
  ) : (
    <Navigate
      replace
      to={{
        pathname: '/auth/login',
        search: pathname !== '/' && `?redirectTo=${encodeURIComponent(`${pathname}${search}`)}`,
      }}
    />
  );
};

RequireAuth.propTypes = { children: PropTypes.any.isRequired };

export default memo(RequireAuth);
