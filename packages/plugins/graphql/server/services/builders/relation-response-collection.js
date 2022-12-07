'use strict';

const { defaultTo, prop, pipe } = require('lodash/fp');
const { builder } = require('./pothosBuilder');

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

      return builder.objectType(name, {
        fields(t) {
          return {
            data: t.field({
              type: [entityName],
              nullable: false,
              resolve: pipe(prop('nodes'), defaultTo([])),
            }),
          };
        },
      });
    },
  };
};
