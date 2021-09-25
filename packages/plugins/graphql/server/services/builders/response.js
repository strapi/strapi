'use strict';

const { objectType } = require('nexus');
const { prop } = require('lodash/fp');

module.exports = ({ strapi }) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  return {
    /**
     * Build a type definition for a content API response for a given content type
     * @param {object} contentType The content type which will be used to build its content API response definition
     * @return {NexusObjectTypeDef}
     */
    buildResponseDefinition(contentType) {
      const name = naming.getEntityResponseName(contentType);
      const entityName = naming.getEntityName(contentType);

      return objectType({
        name,

        definition(t) {
          t.field('data', {
            type: entityName,

            resolve: prop('value'),
          });
        },
      });
    },
  };
};
