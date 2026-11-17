import type { Internal, Schema } from '@strapi/types';

import type { Context } from '../../types';
import {
  assertNestedDepth,
  nestedScopeOf,
  populateNodeAt,
  populateNodeFrom,
  readsAttribute,
  sanitizeNested,
} from '../nested-output';
import type { EntryScope } from '../nested-output';

export default ({ strapi }: Context) => {
  /**
   * The `filters` and `sort` of a repeatable component, judged as a populate node of the root entry
   * the component belongs to: by the root's path-aware field rules and action, as REST
   * judges `populate[seo][filters]` on the root, and not as a query of the component on its own,
   * which would read sub-fields the root hides. The pagination is the component's own.
   */
  const judgeAsRootNode = async (
    scope: EntryScope,
    attributeName: string,
    transformedArgs: Record<string, unknown>,
    auth: unknown
  ) => {
    const { filters, sort, ...rest } = transformedArgs;

    if (filters === undefined && sort === undefined) {
      return rest;
    }

    const node = {
      ...(filters === undefined ? {} : { filters }),
      ...(sort === undefined ? {} : { sort }),
    };
    const query = { populate: populateNodeAt(scope, attributeName, node) };
    const options = {
      auth,
      action: scope.action,
      ...(scope.status === undefined ? {} : { status: scope.status }),
      ...(scope.locale === undefined ? {} : { locale: scope.locale }),
    };

    await strapi.contentAPI.validate.query(query, scope.contentType, options);

    const sanitized = await strapi.contentAPI.sanitize.query(query, scope.contentType, options);
    const judged = populateNodeFrom(scope, attributeName, sanitized.populate) ?? {};

    return {
      ...rest,
      ...(judged.filters === undefined ? {} : { filters: judged.filters }),
      ...(judged.sort === undefined ? {} : { sort: judged.sort }),
    };
  };

  return {
    buildComponentResolver({
      contentTypeUID,
      attributeName,
    }: {
      contentTypeUID: Internal.UID.ContentType;
      attributeName: string;
    }) {
      const { transformArgs } = strapi.plugin('graphql').service('builders').utils;

      return async (parent: any, args: any, ctx: any) => {
        const contentType = strapi.getModel(contentTypeUID);

        // A caller with subject-aware permissions reads a component only where the rules of the
        // entry it belongs to let them read that field of the parent: it is null otherwise
        const active = strapi.contentAPI.permissions.isSubjectAware(ctx?.state?.auth);
        const scope = active ? await nestedScopeOf(strapi, ctx, parent, contentType) : null;

        if (
          active &&
          !(scope && (await readsAttribute(strapi, ctx, scope, contentType, attributeName)))
        ) {
          return null;
        }

        // One level below the parent, within the populate depth of the request's root
        if (scope) {
          assertNestedDepth(strapi, ctx, scope);
        }

        const { component: componentName } = contentType.attributes[
          attributeName
        ] as Schema.Attribute.Component;

        const component = strapi.getModel(componentName);

        const transformedArgs = transformArgs(args, {
          contentType: component,
          usePagination: true,
        });

        const sanitizedQuery = scope
          ? await judgeAsRootNode(scope, attributeName, transformedArgs, ctx?.state?.auth)
          : await (async () => {
              await strapi.contentAPI.validate.query(transformedArgs, component, {
                auth: ctx?.state?.auth,
              });

              return strapi.contentAPI.sanitize.query(transformedArgs, component, {
                auth: ctx?.state?.auth,
              });
            })();

        const dbQuery = strapi.get('query-params').transform(component.uid, sanitizedQuery);

        const data = await strapi.db?.query(contentTypeUID).load(parent, attributeName, dbQuery);

        return scope ? sanitizeNested(strapi, ctx, scope, attributeName, data) : data;
      };
    },
  };
};
