'use strict';

const { pickBy, has } = require('lodash/fp');
const { createContentType } = require('../domain/content-type');

// const validateContentTypesUnicity = contentTypes => {
//   const names = [];
//   contentTypes.forEach(ct => {
//     const singularName = kebabCase(ct.schema.info.singularName);
//     const pluralName = kebabCase(ct.schema.info.pluralName);
//     if (names.includes(singularName)) {
//       throw new Error(`The singular name "${ct.schema.info.singularName}" should be unique`);
//     }
//     names.push(singularName);
//     if (names.includes(pluralName)) {
//       throw new Error(`The plural name "${ct.schema.info.pluralName}" should be unique`);
//     }
//     names.push(pluralName);
//   });
// };

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
      return pickBy((ct, ctUID) => ctUID.startsWith(prefix))(contentTypes);
    },
    add(namespace, rawContentTypes) {
      validateKeySameToSingularName(rawContentTypes);
      for (const rawCtName in rawContentTypes) {
        const rawContentType = rawContentTypes[rawCtName];
        const uid = `${namespace}.${rawContentType.schema.info.singularName}`;
        if (has(uid, contentTypes)) {
          throw new Error(`Content-type ${uid} has already been registered.`);
        }
        contentTypes[uid] = createContentType(uid, rawContentType);
      }
    },
  };
};

module.exports = contentTypesRegistry;
