const adminActions = require('../admin-actions');

module.exports = async () => {
  const actionProvider = strapi.admin.services.permission.provider;
  actionProvider.register(adminActions.actions);
};
