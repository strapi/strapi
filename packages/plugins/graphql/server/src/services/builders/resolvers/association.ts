import { get, merge } from 'lodash/fp';
import { async, contentTypes, errors } from '@strapi/utils';
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
        const transformedQuery = strapi.get('query-params').transform(targetUID, sanitizedQuery);

        const isTargetDraftAndPublishContentType =
          contentTypes.hasDraftAndPublish(targetContentType);

        // Only inherit status if we're resolving within the same query tree that set it
        // Simple check: only inherit if the origin field matches known content type patterns
        let inheritedStatus = null;
        if (context.rootQueryArgs?.status && context.rootQueryArgs?._originField) {
          const originField = context.rootQueryArgs._originField;

          // Only inherit from built-in content type queries (not custom resolvers)
          // Built-in queries follow predictable patterns, custom resolvers don't
          const isBuiltInQuery =
            originField.endsWith('_connection') ||
            // Check if this field exists in the auto-generated GraphQL schema
            // by looking at the GraphQL service's type definitions
            (() => {
              try {
                const graphqlService = strapi.plugin('graphql').service('content-api');
                const schema = graphqlService.buildSchema();
                const queryType = schema.getQueryType();

                // If the field exists in the auto-generated Query type, it's built-in
                return queryType?.getFields()?.[originField] !== undefined;
              } catch {
                // Fallback: assume it's custom if we can't check
                return false;
              }
            })();

          if (isBuiltInQuery) {
            inheritedStatus = context.rootQueryArgs.status;
          }
        }

        const statusToApply = args.status || inheritedStatus;

        const defaultFilters =
          isTargetDraftAndPublishContentType && statusToApply
            ? {
                where: {
                  publishedAt: statusToApply === 'published' ? { $notNull: true } : { $null: true },
                },
              }
            : {};

        const dbQuery = merge(defaultFilters, transformedQuery);

        // Sign media URLs if upload plugin is available and using private provider
        const data = await (async () => {
          const rawData = await strapi.db
            .query(contentTypeUID)
            .load(parent, attributeName, dbQuery);
          if (isMediaAttribute && strapi.plugin('upload')) {
            const { signFileUrls } = strapi.plugin('upload').service('file');

            if (Array.isArray(rawData)) {
              return async.map(rawData, (item: any) => signFileUrls(item));
            }

            if (rawData) {
              return signFileUrls(rawData);
            }
          }

          return rawData;
        })();

        const sanitizeInfo = {
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
          return toEntityResponseCollection(data, sanitizeInfo);
        }

        // Else, it returns an object that matches
        // what the entity-response's resolvers expect
        return toEntityResponse(data, sanitizeInfo);
      };
    },
  };
};
