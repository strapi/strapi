'use strict';

const _ = require('lodash');

const createProvider = emailConfig => {
  const providerName = _.toLower(emailConfig.provider);
  let provider;

  let modulePath;
  try {
    modulePath = require.resolve(`@strapi/provider-email-${providerName}`);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      modulePath = providerName;
    } else {
      throw error;
    }
  }

  try {
    provider = require(modulePath);
  } catch (err) {
    throw new Error(`Could not load email provider "${providerName}".`);
  }

  return provider.init(emailConfig.providerOptions, emailConfig.settings);
};

module.exports = async ({ strapi }) => {
  const emailConfig = strapi.config.get('plugin.email');
  strapi.plugin('email').provider = createProvider(emailConfig);

  // Add permissions
  const actions = [
    {
      section: 'settings',
      category: 'email',
      displayName: 'Access the Email Settings page',
      uid: 'settings.read',
      pluginName: 'email',
    },
  ];

  await strapi.admin.services.permission.actionProvider.registerMany(actions);
};
