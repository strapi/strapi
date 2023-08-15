import { AuthResponse } from '../AuthResponse';

export const AUTH_ROUTES_EE = [
  {
    Component: () => ({ default: AuthResponse }),
    to: '/auth/login/:authResponse',
    exact: true,
  },
];
