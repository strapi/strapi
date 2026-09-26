'use strict';

const TRANSLATABLE_TYPES = new Set(['string', 'text', 'richtext', 'email']);

const SYSTEM_KEYS = new Set([
  'id',
  'documentId',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'locale',
  'localizations',
]);

const isLocalizedAttribute = (attribute) => {
  if (!attribute) {
    return false;
  }
  return attribute.pluginOptions?.i18n?.localized !== false;
};

const walkBlocks = (nodes, items) => {
  if (!Array.isArray(nodes)) {
    return;
  }

  nodes.forEach((node) => {
    if (node && typeof node.text === 'string' && node.text.trim()) {
      items.push({
        value: node.text,
        format: 'text',
        apply(translated) {
          node.text = translated;
        },
      });
    }
    if (node?.children) {
      walkBlocks(node.children, items);
    }
  });
};

const collectFromData = (data, attributes, components, items) => {
  if (!data || !attributes) {
    return;
  }

  Object.entries(attributes).forEach(([name, attribute]) => {
    const value = data[name];
    if (value == null || !isLocalizedAttribute(attribute)) {
      return;
    }

    if (TRANSLATABLE_TYPES.has(attribute.type)) {
      if (typeof value === 'string' && value.trim()) {
        items.push({
          value,
          format: attribute.type === 'richtext' ? 'html' : 'text',
          apply(translated) {
            data[name] = translated;
          },
        });
      }
      return;
    }

    if (attribute.type === 'customField' && typeof value === 'string' && value.trim()) {
      const customField = String(attribute.customField || '');
      const isHtml = customField.includes('html-editor') || customField.endsWith('.html');
      items.push({
        value,
        format: isHtml ? 'html' : 'text',
        apply(translated) {
          data[name] = translated;
        },
      });
      return;
    }

    if (attribute.type === 'blocks' && Array.isArray(value)) {
      walkBlocks(value, items);
      return;
    }

    if (attribute.type === 'component') {
      const componentSchema = components[attribute.component];
      if (!componentSchema) {
        return;
      }
      if (attribute.repeatable && Array.isArray(value)) {
        value.forEach((entry) => collectFromData(entry, componentSchema.attributes, components, items));
      } else if (value && typeof value === 'object') {
        collectFromData(value, componentSchema.attributes, components, items);
      }
      return;
    }

    if (attribute.type === 'dynamiczone' && Array.isArray(value)) {
      value.forEach((entry) => {
        const componentSchema = components[entry?.__component];
        if (componentSchema) {
          collectFromData(entry, componentSchema.attributes, components, items);
        }
      });
    }
  });
};

const toPayload = (data, attributes) => {
  const payload = {};

  Object.keys(attributes).forEach((name) => {
    const attribute = attributes[name];
    if (SYSTEM_KEYS.has(name) || !isLocalizedAttribute(attribute)) {
      return;
    }
    if (['relation', 'media', 'uid', 'password'].includes(attribute.type)) {
      return;
    }
    if (data[name] !== undefined) {
      payload[name] = data[name];
    }
  });

  return payload;
};

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
