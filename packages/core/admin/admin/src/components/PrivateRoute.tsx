import * as React from 'react';

import { auth } from '@strapi/helper-plugin';
import { Redirect, Route, useLocation } from 'react-router-dom';

type PropsOf<T> = T extends React.ComponentType<infer P> ? P : object;

type PrivateRouteProps<TComponent extends React.ElementType> = {
  component: TComponent;
  path: string;
} & PropsOf<TComponent>;

const PrivateRoute = <TComponent extends React.ElementType>({
  component: Component,
  path,
  ...rest
}: PrivateRouteProps<TComponent>) => {
  const { pathname, search } = useLocation();

  return (
    <Route
      path={path}
      render={(props) =>
        auth.getToken() !== null ? (
          <Component {...rest} {...props} />
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
