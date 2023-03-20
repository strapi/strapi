'use strict';

const { getService } = require('./utils');
const { ALLOWED_SORT_STRINGS } = require('./constants');

module.exports = async ({ strapi }) => {
  const defaultConfig = {
    settings: {
      sizeOptimization: true,
      responsiveDimensions: true,
      autoOrientation: false,
    },
    view_configuration: {
      pageSize: 10,
      sort: ALLOWED_SORT_STRINGS[0],
    },
  };

  for (const [key, defaultValue] of Object.entries(defaultConfig)) {
    // set plugin store
    const configurator = strapi.store({ type: 'plugin', name: 'upload', key });

    const config = await configurator.get();
    if (
      config &&
      Object.keys(defaultValue).every((key) => Object.prototype.hasOwnProperty.call(config, key))
    ) {
      continue;
    }

    // if the config does not exist or does not have all the required keys
    // set from the defaultValue ensuring all required settings are present
    await configurator.set({
      value: Object.assign(defaultValue, config || {}),
    });
  }

  await registerPermissionActions();

  await getService('weeklyMetrics').registerCron();
  getService('metrics').sendUploadPluginMetrics();
};

const registerPermissionActions = async () => {
  const actions = [
    {
      section: 'plugins',
      displayName: 'Access the Media Library',
      uid: 'read',
      pluginName: 'upload',
    },
    {
      section: 'plugins',
      displayName: 'Create (upload)',
      uid: 'assets.create',
      subCategory: 'assets',
      pluginName: 'upload',
    },
    {
      section: 'plugins',
      displayName: 'Update (crop, details, replace) + delete',
      uid: 'assets.update',
      subCategory: 'assets',
      pluginName: 'upload',
    },
    {
      section: 'plugins',
      displayName: 'Download',
      uid: 'assets.download',
      subCategory: 'assets',
      pluginName: 'upload',
    },
    {
      section: 'plugins',
      displayName: 'Copy link',
      uid: 'assets.copy-link',
      subCategory: 'assets',
      pluginName: 'upload',
    },
    {
      section: 'plugins',
      displayName: 'Configure view',
      uid: 'configure-view',
      pluginName: 'upload',
    },
    {
      section: 'settings',
      displayName: 'Access the Media Library settings page',
      uid: 'settings.read',
      category: 'media library',
      pluginName: 'upload',
    },
  ];

  await strapi.admin.services.permission.actionProvider.registerMany(actions);
};
