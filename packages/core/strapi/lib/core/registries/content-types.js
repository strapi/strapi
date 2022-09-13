'use strict';

const { pickBy, has } = require('lodash/fp');
const { createContentType } = require('../domain/content-type');
const { addNamespace, hasNamespace } = require('../utils');

const validateKeySameToSingularName = (contentTypes) => {
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
    /**
     * Returns this list of registered contentTypes uids
     * @returns {string[]}
     */
    keys() {
      return Object.keys(contentTypes);
    },

    /**
     * Returns the instance of a contentType. Instantiate the contentType if not already done
     * @param {string} uid
     * @returns
     */
    get(uid) {
      return contentTypes[uid];
    },

    /**
     * Returns a map with all the contentTypes in a namespace
     * @param {string} namespace
     */
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(contentTypes);
    },

    /**
     * Registers a contentType
     * @param {string} uid
     * @param {Object} contentType
     */
    set(uid, contentType) {
      contentTypes[uid] = contentType;
      return this;
    },

    /**
     * Registers a map of contentTypes for a specific namespace
     * @param {string} namespace
     * @param {{ [key: string]: Object }} newContentTypes
     */
    add(namespace, newContentTypes) {
      validateKeySameToSingularName(newContentTypes);

      for (const rawCtName in newContentTypes) {
        const uid = addNamespace(rawCtName, namespace);

        if (has(uid, contentTypes)) {
          throw new Error(`Content-type ${uid} has already been registered.`);
        }

        contentTypes[uid] = createContentType(uid, newContentTypes[rawCtName]);
      }
    },

    /**
     * Wraps a contentType to extend it
     * @param {string} uid
     * @param {(contentType: Object) => Object} extendFn
     */
    extend(ctUID, extendFn) {
      const currentContentType = this.get(ctUID);

      if (!currentContentType) {
        throw new Error(`Content-Type ${ctUID} doesn't exist`);
      }

      const newContentType = extendFn(currentContentType);
      contentTypes[ctUID] = newContentType;

      return this;
    },
  };
};

module.exports = contentTypesRegistry;
