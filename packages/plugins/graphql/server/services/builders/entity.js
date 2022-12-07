'use strict';

const { prop, identity, isEmpty } = require('lodash/fp');
const { builder } = require('./pothosBuilder');

module.exports = ({ strapi }) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  return {
    /**
     * Build a higher level type for a content type which contains the attributes, the ID and the metadata
     * @param {object} contentType The content type which will be used to build its entity type
     * @return {NexusObjectTypeDef}
     */
    buildEntityDefinition(contentType) {
      const { attributes } = contentType;

      const name = naming.getEntityName(contentType);
      const typeName = naming.getTypeName(contentType);

      return builder.objectType(name, {
        fields: (t) => ({
          // Keep the ID attribute at the top level
          id: t.id({ resolve: prop('id') }),

          attributes: !isEmpty(attributes)
            ? t.field({
                type: typeName,
                resolve: identity,
              })
            : undefined,

          // todo[v4]: add the meta field to the entity when there will be data in it (can't add an empty type for now)
          // t.field('meta', { type: utils.getEntityMetaName(contentType) });
        }),
      });
    },
  };
};
