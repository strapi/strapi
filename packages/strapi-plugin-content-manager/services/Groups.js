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
};
