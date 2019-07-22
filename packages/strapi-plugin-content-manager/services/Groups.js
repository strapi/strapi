'use strict';

const storeUtils = require('./utils/store');

const uidToStoreKey = uid => `groups::${uid}`;

module.exports = {
  uidToStoreKey,

  getConfiguration(uid) {
    const storeKey = uidToStoreKey(uid);
    return storeUtils.getModelConfiguration(storeKey);
  },

  setConfiguration(uid, input) {
    const { settings, metadatas, layouts } = input;

    const storeKey = uidToStoreKey(uid);
    return storeUtils.setModelConfiguration(storeKey, {
      uid,
      isGroup: true,
      settings,
      metadatas,
      layouts,
    });
  },

  deleteConfiguration(uid) {
    const storeKey = uidToStoreKey(uid);
    return storeUtils.deleteKey(storeKey);
  },

  formatGroupSchema(group) {
    const { associations, schema, allAttributes } = group;
    return {
      ...schema,
      attributes: Object.keys(allAttributes).reduce((acc, key) => {
        const attr = allAttributes[key];
        const assoc = associations.find(assoc => assoc.alias === key);
        if (assoc) {
          acc[key] = {
            ...attr,
            type: 'relation',
            targetModel: attr.model || attr.collection,
            relationType: assoc.nature,
          };
        } else {
          acc[key] = attr;
        }
        return acc;
      }, {}),
    };
  },
};
