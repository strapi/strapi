'use strict';

const { providerFactory } = require('@strapi/utils');

module.exports = (options = {}) => {
  const provider = providerFactory(options);

  return {
    ...provider,

    async register(action, payload) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new actions outside the bootstrap function.`);
      }

      return provider.register(action, payload);
    },
  };
};
