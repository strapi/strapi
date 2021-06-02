'use strict'

const { cloneDeep, camelCase } = require('lodash/fp');

const createContentType = (model, { apiName, pluginName } = {}) => {
  // todo : validate schema with yup
  const createdContentType = cloneDeep(model);
  const singularModelName = camelCase(model.singularName);
  const pluralModelName = camelCase(model.pluralName);

  if (apiName) {
    Object.assign(createdContentType, {
      uid: `application::${apiName}.${singularModelName}`,
      apiName,
      collectionName: model.collectionName || singularModelName,
    });
  } else if (pluginName) {
    Object.assign(createdContentType, {
      uid: `plugins::${pluginName}.${singularModelName}`,
      plugin: pluginName,
      collectionName:
        createdContentType.collectionName || `${pluginName}_${singularModelName}`.toLowerCase(),
    });
  } else {
    Object.assign(createdContentType, {
      uid: `strapi::${singularModelName}`,
      plugin: 'admin',
    });
  }

  Object.assign(createdContentType, {
    kind: createdContentType.kind || 'collectionType',
    modelType: 'contentType',
    modelName: singularModelName,
    singularName: singularModelName,
    pluralName: pluralModelName,
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
}
