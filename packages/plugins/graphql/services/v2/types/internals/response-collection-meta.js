'use strict';

const { objectType } = require('nexus');

const { RESPONSE_COLLECTION_META_TYPE_NAME, PAGINATION_TYPE_NAME } = require('../constants');

const ResponseCollectionMeta = objectType({
  name: RESPONSE_COLLECTION_META_TYPE_NAME,

  definition(t) {
    t.nonNull.field('pagination', { type: PAGINATION_TYPE_NAME });
  },
});

module.exports = ResponseCollectionMeta;
