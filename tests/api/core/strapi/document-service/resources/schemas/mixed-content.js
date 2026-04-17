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
    sharedMedia: {
      type: 'media',
      multiple: false,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    nestedSharedComponent: {
      type: 'component',
      component: 'mixed-content.mixed-content-nested-media-wrapper',
      repeatable: false,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
  },
};
