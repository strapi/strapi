'use strict';

module.exports = {
  async getSettings(ctx) {
    ctx.body = await strapi.plugin('google-translate').service('credentials').getPublic();
  },

  async updateSettings(ctx) {
    try {
      ctx.body = await strapi
        .plugin('google-translate')
        .service('credentials')
        .save(ctx.request.body || {});
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },

  async testSettings(ctx) {
    try {
      const translated = await strapi.plugin('google-translate').service('google').translateTexts({
        texts: 'Hello',
        sourceLocale: 'en',
        targetLocale: 'es',
        format: 'text',
      });
      ctx.body = { ok: true, sample: translated };
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },
};
