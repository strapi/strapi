'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');
const storeUtils = require('./utils/store');
const { pickSchemaFields } = require('./utils/schema');

const uidToStoreKey = ({ uid, source }) => {
  const sourceKey = source ? `${source}.${uid}` : uid;
  return `content_types::${sourceKey}`;
};

const formatContentTypeLabel = label => _.upperFirst(pluralize(label));

const getModelIn = source => uid => _.get(source, ['models', uid], null);

module.exports = {
  uidToStoreKey,

  getContentTypeConfiguration({ uid, source }) {
    const storeKey = uidToStoreKey({ uid, source });
    return storeUtils.getModelConfiguration(storeKey);
  },

  setContentTypeConfiguration({ uid, source }, input) {
    const { settings, metadatas, layouts } = input;

    const storeKey = uidToStoreKey({ uid, source });
    return storeUtils.setModelConfiguration(storeKey, {
      uid,
      source,
      settings,
      metadatas,
      layouts,
    });
  },

  deleteContentTypeConfiguration({ uid, source }) {
    const storeKey = uidToStoreKey({ uid, source });
    return storeUtils.deleteKey(storeKey);
  },

  formatContentType(opts) {
    const { uid, info, source = null, isDisplayed = true } = opts;

    return {
      uid,
      name: uid,
      label: formatContentTypeLabel(info.name || uid),
      isDisplayed,
      source,
    };
  },

  formatContentTypeSchema(contentType) {
    const { associations, allAttributes } = contentType;
    return {
      ...pickSchemaFields(contentType),
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

  findContentTypeModel({ uid, source }) {
    const getModel = getModelIn(
      !source
        ? strapi
        : source === 'admin'
        ? strapi.admin
        : strapi.plugins[source] || {}
    );
    return getModel(uid);
  },
};
