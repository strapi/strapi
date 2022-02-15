'use strict';

const { validatePreviewInput, validateContentSyncURL } = require('../validation');

module.exports = ({ strapi }) => {
  return {
    async getSettings(ctx) {
      const pluginStore = strapi.store({ type: 'plugin', name: 'gatsby-preview' });
      const previews = await pluginStore.get({ key: 'preview-content-types' });
      const contentSyncURL = await pluginStore.get({ key: 'content-sync-url' });

      ctx.body = {
        data: {
          previews,
          contentSyncURL,
        },
      };
    },

    async updatePreviews(ctx) {
      const { body } = ctx.request;
      const pluginStore = strapi.store({ type: 'plugin', name: 'gatsby-preview' });

      await validatePreviewInput(strapi)(body);

      await pluginStore.set({ key: 'preview-content-types', value: body });

      ctx.body = { data: body };
    },

    async updateContentSyncURL(ctx) {
      const { body } = ctx.request;
      const pluginStore = strapi.store({ type: 'plugin', name: 'gatsby-preview' });

      await validateContentSyncURL(body);

      await pluginStore.set({
        key: 'content-sync-url',
        value: body.contentSyncURL.replace(/\/$/, ''),
      });

      ctx.body = { data: body };
    },
  };
};
