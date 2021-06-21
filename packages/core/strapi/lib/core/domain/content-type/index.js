'use strict';

const { cloneDeep } = require('lodash/fp');
const { validateContentTypeDefinition } = require('./validator');

const createContentType = (definition, { apiName, pluginName } = {}) => {
  validateContentTypeDefinition(definition);

  const createdContentType = cloneDeep(definition);

  if (apiName) {
    Object.assign(createdContentType.schema, {
      uid: `application::${apiName}.${definition.schema.info.singularName}`,
      apiName,
      collectionName: definition.schema.collectionName || definition.schema.info.singularName,
    });
  } else if (pluginName) {
    Object.assign(createdContentType.schema, {
      uid: `plugins::${pluginName}.${definition.schema.info.singularName}`,
      plugin: pluginName,
      collectionName:
        createdContentType.schema.collectionName ||
        `${pluginName}_${definition.schema.info.singularName}`.toLowerCase(),
    });
  } else {
    Object.assign(createdContentType.schema, {
      uid: `strapi::${definition.schema.info.singularName}`,
      plugin: 'admin',
    });
  }

  Object.assign(createdContentType.schema, {
    kind: createdContentType.schema.kind || 'collectionType',
  });
  Object.defineProperty(createdContentType.schema, 'privateAttributes', {
    get() {
      return strapi.getModel(createdContentType.schema.uid).privateAttributes;
    },
  });

  return createdContentType;
};

module.exports = {
  createContentType,
};
