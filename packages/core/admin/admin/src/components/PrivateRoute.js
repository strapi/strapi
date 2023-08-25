import * as React from 'react';

import { auth } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { Redirect, useLocation } from 'react-router-dom';

export const PrivateRoute = ({ component: Component, ...props }) => {
  const { pathname, search } = useLocation();

  if (auth.getToken() !== null) {
    return <Component {...props} />;
  }

  return (
    <Redirect
      to={{
        pathname: '/auth/login',
        search: pathname !== '/' && `?redirectTo=${encodeURIComponent(`${pathname}${search}`)}`,
      }}
    />
  );
};

PrivateRoute.propTypes = {
  component: PropTypes.any.isRequired,
};
