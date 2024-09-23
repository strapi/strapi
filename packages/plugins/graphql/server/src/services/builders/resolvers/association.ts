import { get } from 'lodash/fp';
import { async, errors } from '@strapi/utils';
import type { Internal } from '@strapi/types';

import type { Context } from '../../types';

const { ApplicationError } = errors;

export default ({ strapi }: Context) => {
  const { service: getGraphQLService } = strapi.plugin('graphql');

  const { isMorphRelation, isMedia } = getGraphQLService('utils').attributes;
  const { transformArgs } = getGraphQLService('builders').utils;
  const { toEntityResponse, toEntityResponseCollection } = getGraphQLService('format').returnTypes;

  return {
    buildAssociationResolver({
      contentTypeUID,
      attributeName,
    }: {
      contentTypeUID: Internal.UID.ContentType;
      attributeName: string;
    }) {
      const contentType = strapi.getModel(contentTypeUID);
      const attribute: any = contentType.attributes[attributeName];

      if (!attribute) {
        throw new ApplicationError(
          `Failed to build an association resolver for ${contentTypeUID}::${attributeName}`
        );
      }

      const isMediaAttribute = isMedia(attribute);
      const isMorphAttribute = isMorphRelation(attribute);

      const targetUID = isMediaAttribute ? 'plugin::upload.file' : attribute.target;
      const isToMany = isMediaAttribute ? attribute.multiple : attribute.relation.endsWith('Many');

      const targetContentType = strapi.getModel(targetUID);

      return async (parent: any, args: any = {}, context: any = {}) => {
        const { auth } = context.state;

        const transformedArgs = transformArgs(args, {
          contentType: targetContentType,
          usePagination: true,
        });

        await strapi.contentAPI.validate.query(transformedArgs, targetContentType, {
          auth,
        });

        const sanitizedQuery = await strapi.contentAPI.sanitize.query(
          transformedArgs,
          targetContentType,
          {
            auth,
          }
        );

        const data = await strapi.db
          ?.query(contentTypeUID)
          .load(parent, attributeName, sanitizedQuery);

        const info = {
          args: sanitizedQuery,
          resourceUID: targetUID,
        };

        // If this a polymorphic association, it sanitizes & returns the raw data
        // Note: The value needs to be wrapped in a fake object that represents its parent
        // so that the sanitize util can work properly.
        if (isMorphAttribute) {
          // Helpers used for the data cleanup
          const wrapData = (dataToWrap: any) => ({ [attributeName]: dataToWrap });
          const sanitizeData = (dataToSanitize: any) => {
            return strapi.contentAPI.sanitize.output(dataToSanitize, contentType, { auth });
          };
          const unwrapData = get(attributeName);

          // Sanitizer definition
          const sanitizeMorphAttribute = async.pipe(wrapData, sanitizeData, unwrapData);

          return sanitizeMorphAttribute(data);
        }

        // If this is a to-many relation, it returns an object that
        // matches what the entity-response-collection's resolvers expect
        if (isToMany) {
          return toEntityResponseCollection(data, info);
        }

        // Else, it returns an object that matches
        // what the entity-response's resolvers expect
        return toEntityResponse(data, info);
      };
    },
  };
};
