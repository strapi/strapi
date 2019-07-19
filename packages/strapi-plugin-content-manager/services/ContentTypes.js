'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');

const keys = {
  GENERAL_SETTINGS: 'general_settings',
  CT_SETTINGS: 'content_types_settings',
  CT_METADATAS: 'content_types_metadatas',
  CT_LAYOUTS: 'content_types_layouts',
};

const getStore = () => {
  return strapi.store({
    environment: '',
    type: 'plugin',
    name: 'content_manager',
  });
};

module.exports = {
  async getGeneralSettings() {
    const generalSettings = await getStore().get({
      key: keys.GENERAL_SETTINGS,
    });

    return generalSettings || {};
  },

  setGeneralSettings(data) {
    return getStore().set({
      key: keys.GENERAL_SETTINGS,
      value: data,
    });
  },

  async getContentTypeConfiguration({ uid, source }) {
    const storeKey = generateContentTypeCoreStoreKey({ uid, source });
    const settings = await getContentTypeSettings(storeKey);
    const layouts = await getContentTypeLayouts(storeKey);
    const metadatas = await getContentTypeMetadatas(storeKey);

    return {
      settings: settings,
      metadatas,
      layouts,
    };
  },

  async setContentTypeConfiguration({ uid, source }, input) {
    const { settings, metadatas, layouts } = input;

    const storeKey = generateContentTypeCoreStoreKey({ uid, source });

    if (settings) await setContentTypeSettings(storeKey, settings);
    if (layouts) await setContentTypeLayouts(storeKey, layouts);
    if (metadatas) await setContentTypeMetadatas(storeKey, metadatas);
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
  return source ? `${source}::${uid}` : uid;
};

const getContentTypeSettings = async key => {
  const value = await getStore().get({
    key: `${keys.CT_SETTINGS}_${key}`,
  });
  return value || {};
};

const getContentTypeLayouts = async key => {
  const value = await getStore().get({
    key: `${keys.CT_LAYOUTS}_${key}`,
  });
  return value || {};
};

const getContentTypeMetadatas = async key => {
  const value = await getStore().get({
    key: `${keys.CT_METADATAS}_${key}`,
  });
  return value || {};
};

const setContentTypeSettings = (key, value) =>
  getStore().set({
    key: `${keys.CT_SETTINGS}_${key}`,
    value,
  });

const setContentTypeLayouts = (key, value) =>
  getStore().set({
    key: `${keys.CT_LAYOUTS}_${key}`,
    value,
  });

const setContentTypeMetadatas = (key, value) =>
  getStore().set({
    key: `${keys.CT_METADATAS}_${key}`,
    value,
  });

const formatContentTypeLabel = label => _.upperFirst(pluralize(label));

const getModelIn = source => uid => _.get(source, ['models', uid], null);
