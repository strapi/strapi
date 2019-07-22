'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');
const storeUtils = require('./utils/store');

module.exports = {
  async getGeneralSettings() {
    const generalSettings = await storeUtils.getGeneralSettings();

    return generalSettings || {};
  },

  setGeneralSettings(data) {
    return storeUtils.setGeneralSettings(data);
  },

  getContentTypeConfiguration({ uid, source }) {
    const storeKey = generateContentTypeCoreStoreKey({ uid, source });
    return storeUtils.getModelConfiguration(storeKey);
  },

  setContentTypeConfiguration({ uid, source }, input) {
    const { settings, metadatas, layouts } = input;

    const storeKey = generateContentTypeCoreStoreKey({ uid, source });
    return storeUtils.setModelConfiguration(storeKey, {
      uid,
      source,
      settings,
      metadatas,
      layouts,
    });
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
    const { associations, schema, allAttributes } = contentType;
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

const generateContentTypeCoreStoreKey = ({ uid, source }) => {
  const sourceKey = source ? `${source}.${uid}` : uid;
  return `content_types::${sourceKey}`;
};

const formatContentTypeLabel = label => _.upperFirst(pluralize(label));

const getModelIn = source => uid => _.get(source, ['models', uid], null);
