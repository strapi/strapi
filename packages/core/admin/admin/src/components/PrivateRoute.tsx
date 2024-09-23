import * as React from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../features/Auth';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const token = useAuth('PrivateRoute', (state) => state.token);
  const { pathname, search } = useLocation();

  return token !== null ? (
    children
  ) : (
    <Navigate
      to={{
        pathname: '/auth/login',
        search:
          pathname !== '/'
            ? `?redirectTo=${encodeURIComponent(`${pathname}${search}`)}`
            : undefined,
      }}
    />
  );
};

export { PrivateRoute };
