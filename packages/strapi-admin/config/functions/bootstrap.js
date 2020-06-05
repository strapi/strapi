const adminPermissions = require('../admin-permissions');

module.exports = async () => {
  const permissionProvider = strapi.admin.services['permission-provider'];
  permissionProvider.register(adminPermissions.permissions);
};
