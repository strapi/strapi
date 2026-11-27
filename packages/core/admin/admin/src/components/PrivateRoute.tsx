import * as React from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../features/Auth';
import { getRedirectToSearch } from '../pages/Auth/utils';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const token = useAuth('PrivateRoute', (state) => state.token);
  const location = useLocation();

  return token !== null ? (
    children
  ) : (
    <Navigate
      to={{
        pathname: '/auth/login',
        search: getRedirectToSearch(location),
      }}
    />
  );
};

export { PrivateRoute };
