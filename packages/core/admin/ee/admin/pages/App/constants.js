import * as React from 'react';

export const AUTH_ROUTES_EE = [
  {
    component: React.lazy(() =>
      import('../AuthResponse').then((module) => ({ default: module.AuthResponse }))
    ),
    path: '/auth/login/:authResponse',
  },
];
