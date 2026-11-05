import type { Core } from '@strapi/types';
import { UsersPermissionsRouteValidator } from './validation';

export default (): Core.RouteInput[] => {
  const validator = new UsersPermissionsRouteValidator();

  return [
    {
      method: 'GET',
      path: '/permissions',
      handler: 'permissions.getPermissions',
      response: validator.permissionsResponseSchema,
    },
  ];
};
