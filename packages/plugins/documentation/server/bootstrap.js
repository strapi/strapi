/* eslint-disable no-unreachable */
'use strict';

// Add permissions
const RBAC_ACTIONS = [
  {
    section: 'plugins',
    displayName: 'Access the Documentation',
    uid: 'read',
    pluginName: 'documentation',
  },
  {
    section: 'plugins',
    displayName: 'Update and delete',
    uid: 'settings.update',
    subCategory: 'settings',
    pluginName: 'documentation',
  },
  {
    section: 'plugins',
    displayName: 'Regenerate',
    uid: 'settings.regenerate',
    subCategory: 'settings',
    pluginName: 'documentation',
  },
];

/**
 *
 * @param {{strapi: import("@strapi/strapi").Strapi}} args
 */
module.exports = async ({ strapi }) => {
  await strapi.admin.services.permission.actionProvider.registerMany(RBAC_ACTIONS);

  // Check if the plugin users-permissions is installed because the documentation needs it
  if (Object.keys(strapi.plugins).indexOf('users-permissions') === -1) {
    throw new Error(
      'In order to make the documentation plugin works the users-permissions one is required'
    );
  }

  const pluginStore = strapi.store({
    environment: '',
    type: 'plugin',
    name: 'documentation',
  });

  const restrictedAccess = await pluginStore.get({ key: 'config' });

  if (!restrictedAccess) {
    pluginStore.set({ key: 'config', value: { restrictedAccess: false } });
  }

  await strapi
    .plugin('documentation')
    .service('documentation')
    .generateFullDoc();
};
