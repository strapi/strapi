'use strict';

const { collectFromData, toPayload } = require('../utils/collect-translatable');

module.exports = ({ strapi }) => ({
  async translateEntry({ uid, documentId, sourceLocale, targetLocale }) {
    if (!uid || !documentId || !sourceLocale || !targetLocale) {
      throw new Error('uid, documentId, sourceLocale and targetLocale are required');
    }

    if (sourceLocale === targetLocale) {
      throw new Error('Source and target locale must be different');
    }

    const contentType = strapi.contentTypes[uid];
    if (!contentType) {
      throw new Error(`Unknown content type: ${uid}`);
    }

    if (!contentType.pluginOptions?.i18n?.localized) {
      throw new Error('This content type is not localized');
    }

    const source = await strapi.documents(uid).findOne({
      documentId,
      locale: sourceLocale,
    });

    if (!source) {
      throw new Error(`No content found for locale ${sourceLocale}`);
    }

    const data = JSON.parse(JSON.stringify(source));
    const items = [];
    collectFromData(data, contentType.attributes, strapi.components, items);

    if (!items.length) {
      throw new Error('No translatable text fields were found on this entry');
    }

    const google = strapi.plugin('google-translate').service('google');
    const groups = {
      text: items.filter((item) => item.format === 'text'),
      html: items.filter((item) => item.format === 'html'),
    };

    for (const format of Object.keys(groups)) {
      const group = groups[format];
      if (!group.length) {
        continue;
      }
      const translated = await google.translateTexts({
        texts: group.map((item) => item.value),
        sourceLocale,
        targetLocale,
        format,
      });
      group.forEach((item, index) => item.apply(translated[index]));
    }

    return strapi.documents(uid).update({
      documentId,
      locale: targetLocale,
      data: toPayload(data, contentType.attributes),
    });
  },
});
