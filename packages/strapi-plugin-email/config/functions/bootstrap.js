'use strict';

const _ = require('lodash');

const createProvider = emailConfig => {
  const providerName = _.toLower(emailConfig.provider);
  let provider;
  try {
    provider = require(`strapi-provider-email-${providerName}`);
  } catch (err) {
    throw new Error(
      `The provider package isn't installed. Please run \`npm install strapi-provider-email-${providerName}\` --save`
    );
  }
  return provider.init(emailConfig.providerOptions, emailConfig.settings);
};

module.exports = async () => {
  const emailConfig = _.get(strapi.plugins, 'email.config', {});
  strapi.plugins.email.provider = createProvider(emailConfig);

  // Add permissions
  const actions = [
    {
      section: 'settings',
      category: 'email',
      displayName: 'Read',
      uid: 'settings.read',
      subCategory: 'settings',
    },
    {
      section: 'settings',
      category: 'email',
      displayName: 'Send test email',
      uid: 'settings.test',
      subCategory: 'settings',
    },
  ];

  const { actionProvider } = strapi.admin.services.permission;
  actionProvider.register(actions);
};
