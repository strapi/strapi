'use strict';

const getProviderConfig = () => {
  return strapi.plugins.email.config;
};

module.exports = {
  getProviderConfig,
  async send(options) {
    return strapi.plugins.email.provider.send(options);
  },
};
