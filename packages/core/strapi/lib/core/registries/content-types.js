'use strict';

const { pickBy, has } = require('lodash/fp');
const { createContentType } = require('../domain/content-type');
const { addNamespace } = require('../utils');

const validateKeySameToSingularName = contentTypes => {
  for (const ctName in contentTypes) {
    const contentType = contentTypes[ctName];
    if (ctName !== contentType.schema.info.singularName) {
      throw new Error(
        `The key of the content-type should be the same as its singularName. Found ${ctName} and ${contentType.schema.info.singularName}.`
      );
    }
  }
};

const contentTypesRegistry = () => {
  const contentTypes = {};

  return {
    get(ctUID) {
      return contentTypes[ctUID];
    },
    getAll(prefix = '') {
      if (!prefix) {
        return contentTypes;
      }

      return pickBy((ct, ctUID) => ctUID.startsWith(prefix))(contentTypes);
    },
    add(namespace, rawContentTypes) {
      validateKeySameToSingularName(rawContentTypes);

      for (const rawCtName in rawContentTypes) {
        const uid = addNamespace(rawCtName, namespace);

        if (has(uid, contentTypes)) {
          throw new Error(`Content-type ${uid} has already been registered.`);
        }

        contentTypes[uid] = createContentType(uid, rawContentTypes[rawCtName]);
      }
    },
    extend(ctUID, extendFn) {
      const currentContentType = this.get(ctUID);
      if (!currentContentType) {
        throw new Error(`Content-Type ${ctUID} doesn't exist`);
      }
      const newContentType = extendFn(currentContentType);
      contentTypes[ctUID] = newContentType;
    },
  };
};

module.exports = contentTypesRegistry;
