'use strict';

const { objectType, nonNull } = require('nexus');
const { defaultTo, prop, pipe } = require('lodash/fp');

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

      return objectType({
        name,

        definition(t) {
          t.nonNull.list.field('data', {
            type: nonNull(entityName),

            resolve: pipe(prop('nodes'), defaultTo([])),
          });

          t.nonNull.field('meta', {
            type: RESPONSE_COLLECTION_META_TYPE_NAME,

            // Pass down the args stored in the source object
            resolve: prop('info'),
          });
        },
      });
    },
  };
};
