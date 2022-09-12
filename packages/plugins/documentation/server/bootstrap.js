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
    pluginName: 'documentation',
  },
  {
    section: 'plugins',
    displayName: 'Regenerate',
    uid: 'settings.regenerate',
    pluginName: 'documentation',
  },
  {
    section: 'settings',
    displayName: 'Access the documentation settings page',
    uid: 'settings.read',
    pluginName: 'documentation',
    category: 'documentation',
  },
];

/**
 *
 * @param {{strapi: import("@strapi/strapi").Strapi}} args
 */
module.exports = async ({ strapi }) => {
  await strapi.admin.services.permission.actionProvider.registerMany(RBAC_ACTIONS);

  const pluginStore = strapi.store({
    environment: '',
    type: 'plugin',
    name: 'documentation',
  });

  const config = await pluginStore.get({ key: 'config' });

  if (!config) {
    pluginStore.set({ key: 'config', value: { restrictedAccess: false } });
  }

  await strapi.plugin('documentation').service('documentation').generateFullDoc();
};
