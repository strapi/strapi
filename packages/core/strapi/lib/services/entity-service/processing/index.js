'use strict';

const { createProcessorsManager, processors } = require('./attributes');

module.exports = {
  createDefaultAttributesProcessingImplementation(strapi) {
    const attributesProcessingManager = createProcessorsManager();
    const { PasswordProcessor } = processors;

    attributesProcessingManager.assoc('password', new PasswordProcessor());

    const processAttributesData = (data, context) => {
      const { action, uid } = context;
      const model = strapi.getModel(uid);

      const out = {};

      Object.entries(data).forEach(([name, value]) => {
        const attribute = model.attributes[name];

        out[name] = attributesProcessingManager.process(value, {
          attribute,
          name,
          model,
          action,
        });
      });

      return out;
    };

    return {
      manager: attributesProcessingManager,
      process: processAttributesData,
    };
  },
  attributes: require('./attributes'),
};
