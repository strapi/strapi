import * as React from 'react';

import { Redirect, Route, RouteProps } from 'react-router-dom';

import { useAuth } from '../features/Auth';

interface PrivateRouteProps extends Omit<RouteProps, 'render' | 'component'> {
  children: React.ReactNode;
}

const PrivateRoute = ({ children, ...rest }: PrivateRouteProps) => {
  const token = useAuth('PrivateRoute', (state) => state.token);

  return (
    <Route
      {...rest}
      render={({ location: { pathname, search } }) =>
        token !== null ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/auth/login',
              search:
                pathname !== '/'
                  ? `?redirectTo=${encodeURIComponent(`${pathname}${search}`)}`
                  : undefined,
            }}
          />
        )
      }
    />
  );
};

export { PrivateRoute };
