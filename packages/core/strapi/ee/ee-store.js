'use strict';

const eeStoreModel = {
  uid: 'strapi::ee-store',
  collectionName: 'strapi_ee_store_settings',
  attributes: {
    key: {
      type: 'string',
    },
    value: {
      type: 'text',
    },
  },
};

module.exports = {
  eeStoreModel,
};
