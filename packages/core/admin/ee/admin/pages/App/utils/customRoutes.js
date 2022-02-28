import AuthResponse from '../../AuthResponse';

const customRoutes = [
  {
    Component: () => ({ default: AuthResponse }),
    to: '/auth/login/:authResponse',
    exact: true,
  },
];

export default customRoutes;
