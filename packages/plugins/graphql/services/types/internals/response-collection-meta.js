'use strict';

const { objectType } = require('nexus');

const { RESPONSE_COLLECTION_META_TYPE_NAME, PAGINATION_TYPE_NAME } = require('../constants');

module.exports = ({ strapi }) => ({
  /**
   * A shared type definition used in EntitiesResponseCollection
   * to have information about the collection as a whole
   * @type {NexusObjectTypeDef}
   */
  ResponseCollectionMeta: objectType({
    name: RESPONSE_COLLECTION_META_TYPE_NAME,

    definition(t) {
      t.nonNull.field('pagination', {
        type: PAGINATION_TYPE_NAME,

        async resolve(source) {
          const { args, resourceUID } = source;
          const { start, limit } = args;

          const total = await strapi.entityService.count(resourceUID, { params: args });
          const pageSize = limit;
          const pageCount = limit === 0 ? 0 : Math.ceil(total / limit);
          const page = limit === 0 ? 1 : Math.floor(start / limit) + 1;

          return { total, page, pageSize, pageCount };
        },
      });
    },
  }),
});
