'use strict';

const { providerFactory } = require('@strapi/utils');

module.exports = (options = {}) => {
  const provider = providerFactory(options);

  return {
    ...provider,

    async register(condition) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new conditions outside the bootstrap function.`);
      }

      return provider.register(condition.name, condition);
    },
  };
};
