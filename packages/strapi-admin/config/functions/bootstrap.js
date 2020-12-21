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
};
