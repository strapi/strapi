'use strict';

module.exports = () => {
  const registry = new Map();

  Object.assign(registry, {
    register(provider) {
      if (strapi.isLoaded) {
        throw new Error(`You can't register new provider after the bootstrap`);
      }

      this.set(provider.uid, provider);
    },

    registerMany(providers) {
      providers.forEach(provider => {
        this.register(provider);
      });
    },

    getAll() {
      return Array.from(this.values());
    },
  });

  return registry;
};
