'use strict';

const storeUtils = require('./utils/store');

const uidToStoreKey = uid => `components::${uid}`;

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
      isComponent: true,
      settings,
      metadatas,
      layouts,
    });
  },

  deleteConfiguration(uid) {
    const storeKey = uidToStoreKey(uid);
    return storeUtils.deleteKey(storeKey);
  },

  async updateUID(oldUID, newUID) {
    const oldKey = uidToStoreKey(oldUID);
    const newKey = uidToStoreKey(newUID);

    await storeUtils.setModelConfiguration(oldKey, {
      uid: oldUID,
      isComponent: true,
    });

    return storeUtils.moveKey(oldKey, newKey);
  },
};
