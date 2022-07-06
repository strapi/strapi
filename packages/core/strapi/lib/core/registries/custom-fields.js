'use strict';

const { has } = require('lodash/fp');

const customFieldsRegistry = () => {
  const customFields = {};

  return {
    getAll() {
      return customFields;
    },
    register(customField) {
      const registerCustomField = customField => {
        const { name, plugin, type } = customField;
        if (!name || !type) {
          throw new Error(`Custom fields require a 'name' and 'type' property`);
        }
        // When no plugin is specified, or it isn't found in Strapi,
        // default to the global namespace using the parent application's uuid
        const namespace = strapi.plugin(plugin)
          ? `plugin::${plugin}.${name}`
          : `global::${strapi.config.uuid}.${name}`;

        if (has(namespace, customFields)) {
          throw new Error(`Custom field '${namespace}' has already been registered.`);
        }

        customFields[namespace] = customField;
      };

      if (Array.isArray(customField)) {
        for (const cf of customField) {
          registerCustomField(cf);
        }

        return;
      }

      return registerCustomField(customField);
    },
  };
};

module.exports = customFieldsRegistry;
