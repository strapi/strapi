import { UsersPermissionsRouteValidator } from './validation';

export default (strapi) => {
  const validator = new UsersPermissionsRouteValidator(strapi);

  return [
    {
      method: 'GET',
      path: '/permissions',
      handler: 'permissions.getPermissions',
      response: validator.permissionsResponseSchema,
    },
  ];
};
