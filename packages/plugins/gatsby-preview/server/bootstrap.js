'use strict';

module.exports = async ({ strapi }) => {
  // bootstrap phase
  const pluginStore = strapi.store({ type: 'plugin', name: 'gatsby-preview' });

  await initPreviewContentType(pluginStore, strapi);
};

const initPreviewContentType = async (pluginStore, strapi) => {
  const contentTypesWithPreview = Object.values(strapi.contentTypes).reduce((acc, current) => {
    acc[current.uid] = false;

    return acc;
  }, {});

  const KEY = 'preview-content-types';

  const storedEnabledContentTypes = await pluginStore.get({ key: KEY });

  if (storedEnabledContentTypes) {
    Object.keys(contentTypesWithPreview).forEach(uid => {
      contentTypesWithPreview[uid] = storedEnabledContentTypes[uid] || false;
    });
  }

  await pluginStore.set({ key: KEY, value: contentTypesWithPreview });
};
