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
      rawContentTypes.forEach(rawContentType => {
        const uid = `${namespace}.${rawContentType.schema.info.singularName}`;
        if (has(uid, contentTypes)) {
          throw new Error(`Content-Type ${uid} has already been registered.`);
        }
        contentTypes[uid] = createContentType(uid, rawContentType);
      });
    },
  };
};

module.exports = contentTypesRegistry;
