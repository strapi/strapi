'use strict';

const adminActions = require('../admin-actions');
const adminConditions = require('../admin-conditions');

const registerPermissionActions = () => {
  const { actionProvider } = strapi.admin.services.permission;
  actionProvider.register(adminActions.actions);
};

const registerAdminConditions = () => {
  const { conditionProvider } = strapi.admin.services.permission;
  conditionProvider.registerMany(adminConditions.conditions);
};

module.exports = async () => {
  registerAdminConditions();
  registerPermissionActions();
  await strapi.admin.services.permission.cleanPermissionInDatabase();
  await strapi.admin.services.permission.ensureBoundPermissionsInDatabase();
  await strapi.admin.services.user.migrateUsers();
  await strapi.admin.services.role.createRolesIfNoneExist();
  await strapi.admin.services.permission.resetSuperAdminPermissions();
  await strapi.admin.services.role.displayWarningIfNoSuperAdmin();
  await strapi.admin.services.user.displayWarningIfUsersDontHaveRole();
};
