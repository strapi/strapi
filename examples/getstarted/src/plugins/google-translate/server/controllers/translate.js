'use strict';

module.exports = {
  async locales(ctx) {
    const localesService = strapi.plugin('i18n').service('locales');
    const locales = await localesService.setIsDefault(await localesService.find());
    ctx.body = (locales || []).map((locale) => ({
      code: locale.code,
      name: locale.name,
      isDefault: Boolean(locale.isDefault),
    }));
  },

  async translate(ctx) {
    const { uid, documentId, sourceLocale, targetLocale } = ctx.request.body || {};

    try {
      const entry = await strapi
        .plugin('google-translate')
        .service('translate-entry')
        .translateEntry({ uid, documentId, sourceLocale, targetLocale });

      ctx.body = { ok: true, documentId: entry?.documentId, locale: targetLocale };
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },
};
