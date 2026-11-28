import { merge, omit, property } from 'lodash';
import {
  async,
  contentTypes,
  errors,
  buildPublicationFilterWhere,
  parsePublicationFilter,
} from '@strapi/utils';
import type { Internal } from '@strapi/types';

import type { Context } from '../../types';
import { getOutputScope, stringArg } from '../permissions';
import {
  assertNestedDepth,
  nestedScopeOf,
  readsAttribute,
  sanitizeEntries,
} from '../nested-output';
import type { EntryScope } from '../nested-output';

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

      return async (parent: any, args: any, context: any, info: any) => {
        const { auth } = context.state;

        const isActive = strapi.contentAPI.permissions.isSubjectAware(auth);
        let parentScope: EntryScope | null = null;

        if (isActive) {
          // The field is the parent's: where the rules of its entry hide it from the caller, it is
          // null, whatever the target's rules say
          parentScope = await nestedScopeOf(strapi, context, parent, contentType);

          if (!(
            parentScope &&
            (await readsAttribute(strapi, context, parentScope, contentType, attributeName))
          )) {
            return null;
          }

          // One level below the parent: within the populate depth of the request's root, as REST
          // counts it
          assertNestedDepth(strapi, context, parentScope);

          // A polymorphic relation has no one target to read the query, the drafts gate and the
          // conditions of, and its items would need each one's own: not read for these callers
          // (the branch below was never reachable: a morph has no `target` to take the model of)
          if (isMorphAttribute) {
            throw new errors.ForbiddenError('Reading a polymorphic relation is not allowed');
          }
        }

        const transformedArgs = transformArgs(args, {
          contentType: targetContentType,
          usePagination: true,
        });

        const isTargetDraftAndPublishContentType =
          contentTypes.hasDraftAndPublish(targetContentType);

        // Helper to check if a field is from built-in queries (not custom resolvers)
        // Use the precomputed lookup populated by the content-api service at schema build time.
        const isBuiltInQueryField = (fieldName: string) => {
          const graphqlService = strapi.plugin('graphql').service('content-api');
          return graphqlService.isBuiltInQueryField(fieldName);
        };

        // Walk back to the root of info.path so we pick up the args of *our* query branch
        let rootPath = info?.path;
        while (rootPath?.prev) {
          rootPath = rootPath.prev;
        }
        const rootQueryArgs = rootPath ? context.rootQueryArgsByPath?.get(rootPath.key) : undefined;

        const shouldInheritRootQueryStatus =
          rootQueryArgs?._originField && isBuiltInQueryField(rootQueryArgs._originField);

        // The version a built-in mutation returned, for a caller with subject-aware permissions
        // (nothing is recorded for anyone else): its relations are read as a query's would be
        const writeScope = rootPath ? context.writeScopeByPath?.get(rootPath.key) : undefined;

        // Only inherit status from built-in queries to avoid conflicts with custom resolvers.
        // Built-in root queries default to published results; draft/preview queries pass `status`.
        // Nested relations should match that parent query.
        const inheritedStatus = shouldInheritRootQueryStatus
          ? rootQueryArgs.status || 'published'
          : (writeScope?.status ?? null);

        // A caller with subject-aware permissions reads published where nothing says which
        // version (a custom resolver's root): never drafts it was not asked for
        const statusToApply = args.status || inheritedStatus || (isActive ? 'published' : null);

        const inheritedPublicationFilter =
          rootQueryArgs?.publicationFilter !== undefined &&
          rootQueryArgs?._originField &&
          isBuiltInQueryField(rootQueryArgs._originField)
            ? rootQueryArgs.publicationFilter
            : undefined;

        const inheritedHasPublishedVersion =
          rootQueryArgs?.hasPublishedVersion !== undefined &&
          rootQueryArgs?._originField &&
          isBuiltInQueryField(rootQueryArgs._originField)
            ? rootQueryArgs.hasPublishedVersion
            : undefined;

        let effectivePublicationFilter: string | undefined = inheritedPublicationFilter;
        if (
          effectivePublicationFilter === undefined &&
          inheritedHasPublishedVersion !== undefined
        ) {
          effectivePublicationFilter = inheritedHasPublishedVersion
            ? 'has-published-version-document'
            : 'never-published-document';
        }

        // What the query layer applies to the target besides the caller's own query: the status and
        // publication filter inherited from the root. A caller with subject-aware permissions has
        // them validated and sanitized as the query's own (the drafts gate, and the target's
        // `read-drafts` conditions): the root asked for them on its own type, not on this one.
        // Only a status that is set goes in: a `status` key that is undefined or null reads drafts.
        const inheritedRead: Record<string, unknown> = isActive
          ? {
              ...(statusToApply ? { status: statusToApply } : {}),
              ...(effectivePublicationFilter !== undefined
                ? { publicationFilter: effectivePublicationFilter }
                : {}),
            }
          : {};
        const queryToCheck = isActive ? { ...transformedArgs, ...inheritedRead } : transformedArgs;

        await strapi.contentAPI.validate.query(queryToCheck, targetContentType, {
          auth,
          action: 'find',
        });

        const sanitizedWithRead = await strapi.contentAPI.sanitize.query(
          queryToCheck,
          targetContentType,
          {
            auth,
            action: 'find',
          }
        );
        // The resolver applies the inherited status itself (below): keep it out of the load
        const sanitizedQuery = isActive
          ? omit(sanitizedWithRead, Object.keys(inheritedRead))
          : sanitizedWithRead;
        const transformedQuery = strapi.get('query-params').transform(targetUID, sanitizedQuery);

        const defaultFilters =
          isTargetDraftAndPublishContentType && statusToApply
            ? {
                where: {
                  publishedAt: statusToApply === 'published' ? { $notNull: true } : { $null: true },
                },
              }
            : {};

        let publicationFilterWhere: Record<string, any> = {};
        if (isTargetDraftAndPublishContentType && effectivePublicationFilter !== undefined) {
          let mode;
          try {
            mode = parsePublicationFilter(effectivePublicationFilter);
          } catch {
            mode = undefined;
          }
          if (mode !== undefined) {
            const meta = strapi.db.metadata.get(targetUID);
            const st = statusToApply === 'published' ? 'published' : 'draft';
            const cond = buildPublicationFilterWhere(
              strapi.db.connection,
              meta,
              targetContentType,
              mode,
              st
            );
            if (cond && Object.keys(cond).length > 0) {
              publicationFilterWhere = { where: cond };
            }
          }
        }

        const dbQuery = merge({}, defaultFilters, publicationFilterWhere, transformedQuery);

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
          const unwrapData = property(attributeName);

          // Sanitizer definition
          const sanitizeMorphAttribute = async.pipe(wrapData, sanitizeData, unwrapData);

          return sanitizeMorphAttribute(data);
        }

        // A caller with subject-aware permissions gets the target's output rules too (private
        // fields, the field rules of its `find` row), in the status and locale it was read in
        const output =
          isActive && data !== null && data !== undefined
            ? await sanitizeEntries(strapi, context, targetContentType, data, {
                action: 'find',
                ...(await getOutputScope(strapi, targetContentType, {
                  status: isTargetDraftAndPublishContentType ? statusToApply : undefined,
                  locale: stringArg(rootQueryArgs?.locale),
                })),
                ...(parentScope
                  ? { depth: parentScope.depth + 1, depthRoot: parentScope.depthRoot }
                  : {}),
              })
            : data;

        // If this is a to-many relation, it returns an object that
        // matches what the entity-response-collection's resolvers expect
        if (isToMany) {
          return toEntityResponseCollection(output, sanitizeInfo);
        }

        // Else, it returns an object that matches
        // what the entity-response's resolvers expect
        return toEntityResponse(output, sanitizeInfo);
      };
    },
  };
};
