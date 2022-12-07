'use strict';

const { prop } = require('lodash/fp');
const { builder } = require('./pothosBuilder');

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

      return builder.objectType(name, {
        fields(t) {
          return {
            data: t.field({
              type: entityName,

              resolve: prop('value'),
            }),
          };
        },
      });
    },
  };
};
