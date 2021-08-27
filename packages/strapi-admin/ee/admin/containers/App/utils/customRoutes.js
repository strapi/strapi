import AuthResponse from '../../AuthResponse';

const customRoutes = [
  {
    Component: AuthResponse,
    to: '/auth/login/:authResponse',
    exact: true,
  },
];

export default customRoutes;
