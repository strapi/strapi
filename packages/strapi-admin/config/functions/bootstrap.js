'use strict';

const adminActions = require('../admin-actions');

const registerPermissionActions = () => {
  const { actionProvider } = strapi.admin.services.permission;
  actionProvider.register(adminActions.actions);
};

const cleanPermissionInDatabase = async () => {
  const actionProvider = strapi.admin.services.permission;
  const dbPermissions = await strapi.admin.services.permission.find();
  const allActionsMap = actionProvider.getAllByMap();
  const permissionsToRemoveIds = [];

  dbPermissions.forEach(perm => {
    if (
      !allActionsMap.has(perm.action) ||
      (allActionsMap.get(perm.action).section === 'contentTypes' &&
        !allActionsMap.get(perm.action).subjects.includes(perm.subject))
    ) {
      permissionsToRemoveIds.push(perm.id);
    }
  });

  await strapi.admin.services.permission.deleteByIds(permissionsToRemoveIds);
};

module.exports = async () => {
  registerPermissionActions();
  await cleanPermissionInDatabase();
};
