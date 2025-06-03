'use strict';

module.exports = {
  kind: 'collectionType',
  collectionName: 'categories',
  singularName: 'category',
  pluralName: 'categories',
  displayName: 'Category',
  description: '',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
      unique: true,
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};
