'use strict';

module.exports = async ({ strapi }) => {
  // bootstrap phase
  const pluginStore = strapi.store({ type: 'plugin', name: 'gatsby-preview' });

  await initPreviewContentType(pluginStore, strapi);
};

const initPreviewContentType = async (pluginStore, strapi) => {
  const KEY = 'preview-content-types';

  const storedEnabledContentTypes = (await pluginStore.get({ key: KEY })) || {};

  const contentTypesWithPreview = Object.keys(strapi.contentTypes).reduce((acc, uid) => {
    acc[uid] = storedEnabledContentTypes[uid] || false;

    return acc;
  }, {});

  await pluginStore.set({ key: KEY, value: contentTypesWithPreview });
};
