'use strict'

const { createContentType } = require('@strapi/utils').contentTypes;

module.exports = (pluginName, contentTypeDefinitions) => {
  const contentTypes = contentTypeDefinitions.map(ct =>
    createContentType(ct, { pluginName })
  );

  const contentTypesMap = contentTypes.reduce((map, ct) => {
    map[ct.info.singularName] = ct;
    map[ct.info.pluralName] = ct;
  }, {});

  return {
    get(ctName) {
      return contentTypesMap[ctName];
    },
    getAll() {
      return contentTypes;
    }
  }
};
