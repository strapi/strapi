'use strict';

module.exports = {
  collectionName: 'components_unique_top_level',
  displayName: 'compo_unique_top_level',
  singularName: 'compo_unique_top_level',
  category: 'article',
  attributes: {
    nestedUnique: {
      type: 'component',
      repeatable: false,
      component: 'article.compo-unique-all',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};
