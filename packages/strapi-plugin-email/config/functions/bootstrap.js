'use strict';

const _ = require('lodash');

const createProvider = providerConfig => {
  const providerName = _.toLower(providerConfig.name);
  try {
    const providerInstance = require(`strapi-provider-email-${providerName}`).init(providerConfig);

    return providerInstance;
  } catch (err) {
    strapi.log.error(err);
    throw new Error(
      `The provider package isn't installed. Please run \`npm install strapi-provider-email-${providerName}\``
    );
  }
};

module.exports = async () => {
  const providerConfig = _.get(strapi.plugins, 'email.config.provider', {});
  strapi.plugins.email.provider = createProvider(providerConfig);
};
