'use strict';

const { UsersPermissionsRouteValidator } = require('./validation');

module.exports = (strapi) => {
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
