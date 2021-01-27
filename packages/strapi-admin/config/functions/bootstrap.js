'use strict';

const { merge } = require('lodash/fp');
const adminActions = require('../admin-actions');
const adminConditions = require('../admin-conditions');

const defaultAdminAuthSettings = {
  providers: {
    autoRegister: false,
    defaultRole: null,
  },
};

const registerPermissionActions = () => {
  const { actionProvider } = strapi.admin.services.permission;
  actionProvider.register(adminActions.actions);
};

const registerAdminConditions = () => {
  const { conditionProvider } = strapi.admin.services.permission;
  conditionProvider.registerMany(adminConditions.conditions);
};

const syncAuthSettings = async () => {
  const adminStore = await strapi.store({ type: 'core', environment: '', name: 'admin' });
  const adminAuthSettings = await adminStore.get({ key: 'auth' });
  const newAuthSettings = merge(defaultAdminAuthSettings, adminAuthSettings);

  const roleExists = await strapi.admin.services.role.exists({
    id: newAuthSettings.providers.defaultRole,
  });

  // Reset the default SSO role if it has been deleted manually
  if (!roleExists) {
    newAuthSettings.providers.defaultRole = null;
  }

  await adminStore.set({ key: 'auth', value: newAuthSettings });
};

module.exports = async () => {
  registerAdminConditions();
  registerPermissionActions();
  await strapi.admin.services.permission.cleanPermissionInDatabase();
  await strapi.admin.services.permission.ensureBoundPermissionsInDatabase();
  await strapi.admin.services.user.migrateUsers();
  await strapi.admin.services.role.createRolesIfNoneExist();
  await strapi.admin.services.role.resetSuperAdminPermissions();
  await strapi.admin.services.role.displayWarningIfNoSuperAdmin();
  await strapi.admin.services.user.displayWarningIfUsersDontHaveRole();

  await syncAuthSettings();

  strapi.admin.destroy = () => {
    strapi.admin.services.permission.conditionProvider.clear();
    strapi.admin.services.permission.actionProvider.clear();
  };
};
