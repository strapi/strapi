'use strict';

module.exports = {
  kind: 'collectionType',
  collectionName: 'authors',
  singularName: 'author',
  pluralName: 'authors',
  displayName: 'Author',
  description: '',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: false,
    },
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
  },
};
