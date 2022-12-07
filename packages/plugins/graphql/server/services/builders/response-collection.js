'use strict';

const { defaultTo, prop, pipe } = require('lodash/fp');
const { builder } = require('./pothosBuilder');

module.exports = ({ strapi }) => {
  const { naming } = strapi.plugin('graphql').service('utils');
  const { RESPONSE_COLLECTION_META_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return {
    /**
     * Build a type definition for a content API collection response for a given content type
     * @param {object} contentType The content type which will be used to build its content API response definition
     * @return {NexusObjectTypeDef}
     */
    buildResponseCollectionDefinition(contentType) {
      const name = naming.getEntityResponseCollectionName(contentType);
      const entityName = naming.getEntityName(contentType);

      return builder.objectType(name, {
        fields(t) {
          return {
            data: t.field({
              type: [entityName],
              nullable: false,
              resolve: pipe(prop('nodes'), defaultTo([])),
            }),
            meta: t.field({
              type: RESPONSE_COLLECTION_META_TYPE_NAME,
              nullable: false,

              // Pass down the args stored in the source object
              resolve: prop('info'),
            }),
          };
        },
      });
    },
  };
};
