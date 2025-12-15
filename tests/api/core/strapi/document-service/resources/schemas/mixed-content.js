'use strict';

module.exports = {
  kind: 'collectionType',
  collectionName: 'mixed_contents',
  singularName: 'mixed-content',
  pluralName: 'mixed-contents',
  displayName: 'Mixed Content',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    localizedText: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    sharedText: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
  },
};
