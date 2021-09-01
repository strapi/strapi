'use strict';

const createExtension = require('./extension');
const createExtensionRegistry = require('./extension-registry');

module.exports = context => {
  const extensionRegistry = createExtensionRegistry(context);

  return {
    /**
     * Returns an Extension instance based on the provided name
     * @param name
     * @param configuration
     */
    for(name) {
      if (!extensionRegistry.has(name)) {
        extensionRegistry.add(name);
      }

      return extensionRegistry.get(name);
    },

    createExtension,
    registry: extensionRegistry,
  };
};
