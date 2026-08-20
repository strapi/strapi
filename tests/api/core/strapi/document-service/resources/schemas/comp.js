'use strict';

module.exports = {
  collectionName: 'components_article_comments',
  displayName: 'Comp',
  singularName: 'comp',
  category: 'article',
  attributes: {
    text: {
      type: 'string',
      // Required leaf: lets component-replacement.test.api.ts assert that an id-less
      // component on update is a create (which must supply `text`) rather than a patch.
      required: true,
    },
    note: {
      type: 'string',
    },
  },
};
