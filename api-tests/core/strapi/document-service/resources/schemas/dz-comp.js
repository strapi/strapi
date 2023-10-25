'use strict';

module.exports = {
  collectionName: 'components_article_dz_comps',
  displayName: 'dz_comp',
  singularName: 'dz_comp',
  category: 'article',
  attributes: {
    name: {
      type: 'string',
    },
    media: {
      allowedTypes: ['images', 'files', 'videos', 'audios'],
      type: 'media',
      multiple: true,
    },
  },
};
