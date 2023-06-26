import { AuthResponse } from '../AuthResponse';

export const ROUTES_EE = [
  {
    Component: () => ({ default: AuthResponse }),
    to: '/auth/login/:authResponse',
    exact: true,
  },
];
