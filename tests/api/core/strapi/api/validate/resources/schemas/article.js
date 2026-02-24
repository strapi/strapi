'use strict';

module.exports = {
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  kind: 'collectionType',
  // Content-type-builder reads top-level draftAndPublish when creating the type
  draftAndPublish: true,
  options: {},
  attributes: {
    title: {
      type: 'string',
    },
  },
};
