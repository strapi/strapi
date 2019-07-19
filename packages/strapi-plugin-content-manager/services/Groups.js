'use strict';

const keys = {
  GROUP_SETTINGS: 'groups_settings',
  GROUP_METADATAS: 'groups_metadatas',
  GROUP_LAYOUTS: 'groups_layouts',
};

const getStore = () => {
  return strapi.store({
    environment: '',
    type: 'plugin',
    name: 'content_manager',
  });
};

module.exports = {
  async getConfiguration(uid) {
    const settings = await getGroupSettings(uid);
    const layouts = await getGroupLayouts(uid);
    const metadatas = await getGroupMetadatas(uid);

    return {
      settings,
      metadatas,
      layouts,
    };
  },

  async setConfiguration(uid, input) {
    const { settings, metadatas, layouts } = input;

    if (settings) await setGroupSettings(uid, settings);
    if (layouts) await setGroupLayouts(uid, layouts);
    if (metadatas) await setGroupMetadatas(uid, metadatas);
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

const getGroupSettings = async key => {
  const value = await getStore().get({
    key: `${keys.GROUP_SETTINGS}_${key}`,
  });
  return value || {};
};

const getGroupLayouts = async key => {
  const value = await getStore().get({
    key: `${keys.GROUP_LAYOUTS}_${key}`,
  });
  return value || {};
};

const getGroupMetadatas = async key => {
  const value = await getStore().get({
    key: `${keys.GROUP_METADATAS}_${key}`,
  });
  return value || {};
};

const setGroupSettings = (key, value) =>
  getStore().set({
    key: `${keys.GROUP_SETTINGS}_${key}`,
    value,
  });

const setGroupLayouts = (key, value) =>
  getStore().set({
    key: `${keys.GROUP_LAYOUTS}_${key}`,
    value,
  });

const setGroupMetadatas = (key, value) =>
  getStore().set({
    key: `${keys.GROUP_METADATAS}_${key}`,
    value,
  });
