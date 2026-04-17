'use strict';

module.exports = {
  collectionName: 'components_mixed_content_nested_media_wrappers',
  displayName: 'Mixed Content Nested Media Wrapper',
  singularName: 'mixed-content-nested-media-wrapper',
  category: 'mixed-content',
  attributes: {
    nestedLeaf: {
      type: 'component',
      component: 'mixed-content.mixed-content-nested-media-leaf',
      repeatable: false,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
  },
};
