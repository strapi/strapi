const adminPermissions = require('../admin-permissions');

module.exports = async () => {
  strapi.admin.permissionProvider = strapi.admin.services[
    'permission-provider'
  ].createPermissionProvider();
  strapi.admin.permissionProvider.register(adminPermissions.permissions);
};
