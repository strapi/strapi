import type { Core } from '@strapi/types';

const routes: Core.RouteInput[] = [
  {
    method: 'GET',
    path: '/permissions',
    handler: 'permissions.getPermissions',
  },
  {
    method: 'GET',
    path: '/policies',
    handler: 'permissions.getPolicies',
  },

  {
    method: 'GET',
    path: '/routes',
    handler: 'permissions.getRoutes',
  },
];

export default routes;
