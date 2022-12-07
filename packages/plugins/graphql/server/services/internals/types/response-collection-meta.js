'use strict';

const { builder } = require('../../builders/pothosBuilder');

module.exports = ({ strapi }) => {
  const { RESPONSE_COLLECTION_META_TYPE_NAME, PAGINATION_TYPE_NAME } = strapi
    .plugin('graphql')
    .service('constants');

  return {
    /**
     * A shared type definition used in EntitiesResponseCollection
     * to have information about the collection as a whole
     * @type {NexusObjectTypeDef}
     */
    ResponseCollectionMeta: builder.objectType(RESPONSE_COLLECTION_META_TYPE_NAME, {
      fields(t) {
        return {
          pagination: t.field({
            type: PAGINATION_TYPE_NAME,

            async resolve(parent) {
              const { args, resourceUID } = parent;
              const { start, limit } = args;
              const safeLimit = Math.max(limit, 1);

              const total = await strapi.entityService.count(resourceUID, args);
              const pageSize = limit === -1 ? total - start : safeLimit;
              const pageCount = limit === -1 ? safeLimit : Math.ceil(total / safeLimit);
              const page = limit === -1 ? safeLimit : Math.floor(start / safeLimit) + 1;

              return { total, page, pageSize, pageCount };
            },
          }),
        };
      },
    }),
  };
};
