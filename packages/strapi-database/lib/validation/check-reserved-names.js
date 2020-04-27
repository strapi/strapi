'use strict';

const _ = require('lodash');
const constants = require('../constants');

const checkReservedAttributeNames = model => {
  const usedReservedAttributeNames = _.intersection(
    Object.keys(model.attributes),
    constants.RESERVED_ATTRIBUTE_NAMES
  );

  if (usedReservedAttributeNames.length > 0) {
    throw new Error(
      `Model "${
        model.modelName
      }" is using reserved attribute names "${usedReservedAttributeNames.join(', ')}".`
    );
  }
};

const checkReservedModelName = model => {
  if (constants.RESERVED_MODEL_NAMES.includes(model.modelName)) {
    throw new Error(
      `"${model.modelName}" is a reserved model name. You need to rename your model and the files associated with it`
    );
  }
};

/**
 * Checks that there are no model using reserved names (content type, component, attributes)
 */
module.exports = strapi => {
  Object.keys(strapi.api).forEach(apiName => {
    const api = strapi.api[apiName];

    const models = api.models ? Object.values(api.models) : [];
    models.forEach(model => {
      checkReservedModelName(model);
      checkReservedAttributeNames(model);
    });
  });

  Object.keys(strapi.plugins).forEach(pluginName => {
    const plugin = strapi.plugins[pluginName];

    const models = plugin.models ? Object.values(plugin.models) : [];
    models.forEach(model => {
      checkReservedModelName(model);
      checkReservedAttributeNames(model);
    });
  });

  //TODO: check reserved timestamps per connector when model as timestamps enabled
};
