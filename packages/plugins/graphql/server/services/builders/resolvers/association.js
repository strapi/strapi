'use strict';

module.exports = ({ strapi }) => {
  const { service: getGraphQLService } = strapi.plugin('graphql');

  const { isMorphRelation, isMedia } = getGraphQLService('utils').attributes;
  const { transformArgs } = getGraphQLService('builders').utils;
  const { toEntityResponse, toEntityResponseCollection } = getGraphQLService('format').returnTypes;

  return {
    buildAssociationResolver({ contentTypeUID, attributeName }) {
      const contentType = strapi.getModel(contentTypeUID);
      const attribute = contentType.attributes[attributeName];

      if (!attribute) {
        throw new Error(
          `Failed to build an association resolver for ${contentTypeUID}::${attributeName}`
        );
      }

      const isMediaAttribute = isMedia(attribute);
      const isMorphAttribute = isMorphRelation(attribute);

      const targetUID = isMediaAttribute ? 'plugins::upload.file' : attribute.target;
      const isToMany = isMediaAttribute ? attribute.multiple : attribute.relation.endsWith('Many');

      const targetContentType = strapi.getModel(targetUID);

      return async (parent, args = {}) => {
        const transformedArgs = transformArgs(args, {
          contentType: targetContentType,
          usePagination: true,
        });

        const data = await strapi.entityService.load(
          contentTypeUID,
          parent,
          attributeName,
          transformedArgs
        );

        const info = {
          args: transformedArgs,
          resourceUID: targetUID,
        };

        // If this a polymorphic association, it returns the raw data
        if (isMorphAttribute) {
          return data;
        }

        // If this is a to-many relation, it returns an object that
        // matches what the entity-response-collection's resolvers expect
        else if (isToMany) {
          return toEntityResponseCollection(data, info);
        }

        // Else, it returns an object that matches
        // what the entity-response's resolvers expect
        return toEntityResponse(data, info);
      };
    },
  };
};
