'use strict';

module.exports = ({ strapi }) => {
  const registry = new Map();

  return {
    /**
     * Create & add a new extension to the registry
     * @param {string} name
     * @return {this}
     */
    add(name) {
      const extension = strapi
        .plugin('graphql')
        .service('extension')
        .createExtension({ strapi });

      registry.set(name, extension);

      return this;
    },

    /**
     * Delete an extension by its name
     * @param {string} name
     * @return {this}
     */
    remove(name) {
      registry.delete(name);

      return this;
    },

    /**
     * Retrieve an extension by its name
     * @param {string} name
     * @return {object}
     */
    get(name) {
      return registry.get(name);
    },

    /**
     * Check if a given name is available in the extension registry
     * @param {string} name
     * @return {boolean}
     */
    has(name) {
      return registry.has(name);
    },
  };
};
