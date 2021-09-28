'use strict';

const { objectType, nonNull } = require('nexus');
const { defaultTo, prop, pipe } = require('lodash/fp');

module.exports = ({ strapi }) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  return {
    /**
     * Build a type definition for a content API relation's collection response for a given content type
     * @param {object} contentType The content type which will be used to build its content API response definition
     * @return {NexusObjectTypeDef}
     */
    buildRelationResponseCollectionDefinition(contentType) {
      const name = naming.getRelationResponseCollectionName(contentType);
      const entityName = naming.getEntityName(contentType);

      return objectType({
        name,

        definition(t) {
          t.nonNull.list.field('data', {
            type: nonNull(entityName),

            resolve: pipe(
              prop('nodes'),
              defaultTo([])
            ),
          });
        },
      });
    },
  };
};
