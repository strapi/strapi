import * as React from 'react';

export const AUTH_ROUTES_EE = [
  {
    Component() {
      return React.lazy(() =>
        import('../AuthResponse').then((module) => ({ default: module.AuthResponse }))
      );
    },
    path: '/auth/login/:authResponse',
  },
];
