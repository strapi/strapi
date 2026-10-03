'use strict';

module.exports = {
  collectionName: 'components_article_dz_comps',
  displayName: 'dz_comp',
  singularName: 'dz_comp',
  category: 'article',
  attributes: {
    name: {
      // Required leaf: lets component-replacement.test.api.ts assert that an id-less
      // dynamic-zone entry is a create (which must supply `name`) rather than a patch.
      // Every other suite using this component already supplies it.
      type: 'string',
      required: true,
    },
    media: {
      allowedTypes: ['images', 'files', 'videos', 'audios'],
      type: 'media',
      multiple: true,
    },
  },
};
