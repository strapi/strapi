'use strict';

const storeUtils = require('./utils/store');

module.exports = {
  async getConfiguration(uid) {
    const storeKey = groupUIDToStoreKey(uid);
    return storeUtils.getModelConfiguration(storeKey);
  },

  async setConfiguration(uid, input) {
    const { settings, metadatas, layouts } = input;

    const storeKey = groupUIDToStoreKey(uid);
    return storeUtils.setModelConfiguration(storeKey, {
      uid,
      isGroup: true,
      settings,
      metadatas,
      layouts,
    });
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

const groupUIDToStoreKey = uid => `groups::${uid}`;
