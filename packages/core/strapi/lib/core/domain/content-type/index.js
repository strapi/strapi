'use strict';

const { cloneDeep } = require('lodash/fp');
const { validateContentTypeDefinition } = require('./validator');

const createContentType = (definition, { apiName, pluginName } = {}) => {
  const createdContentType = cloneDeep(definition);

  validateContentTypeDefinition(definition);

  if (apiName) {
    Object.assign(createdContentType, {
      uid: `application::${apiName}.${definition.info.singularName}`,
      apiName,
      collectionName: definition.collectionName || definition.info.singularName,
    });
  } else if (pluginName) {
    Object.assign(createdContentType, {
      uid: `plugins::${pluginName}.${definition.info.singularName}`,
      plugin: pluginName,
      collectionName:
        createdContentType.collectionName ||
        `${pluginName}_${definition.info.singularName}`.toLowerCase(),
    });
  } else {
    Object.assign(createdContentType, {
      uid: `strapi::${definition.info.singularName}`,
      plugin: 'admin',
    });
  }

  Object.assign(createdContentType, {
    kind: createdContentType.kind || 'collectionType',
  });
  Object.defineProperty(createdContentType, 'privateAttributes', {
    get() {
      return strapi.getModel(createdContentType.uid).privateAttributes;
    },
  });

  return createdContentType;
};

module.exports = {
  createContentType,
};
