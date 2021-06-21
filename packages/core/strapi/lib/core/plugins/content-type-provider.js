'use strict';

const { createContentType } = require('../domain/content-type');

module.exports = (pluginName, contentTypeDefinitions) => {
  const contentTypes = contentTypeDefinitions.map(ct => createContentType(ct, { pluginName }));
  const contentTypesMap = contentTypes.reduce((map, ct) => {
    map[ct.schema.info.singularName] = ct;
    map[ct.schema.info.pluralName] = ct;
    return map;
  }, {});

  const provider = ctName => provider.get(ctName);

  Object.assign(provider, {
    get(ctName) {
      return contentTypesMap[ctName];
    },
    getAll() {
      return contentTypes;
    },
  });

  return provider;
};
