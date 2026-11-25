'use strict';

module.exports = {
  collectionName: 'components_mixed_content_nested_media_leaves',
  displayName: 'Mixed Content Nested Media Leaf',
  singularName: 'mixed-content-nested-media-leaf',
  category: 'mixed-content',
  attributes: {
    media: {
      type: 'media',
      multiple: false,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
  },
};
