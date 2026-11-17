import type { Internal } from '@strapi/types';

import type { Context } from '../../types';
import { assertNestedDepth, nestedScopeOf, readsAttribute, sanitizeNested } from '../nested-output';

export default ({ strapi }: Context) => ({
  buildDynamicZoneResolver({
    contentTypeUID,
    attributeName,
  }: {
    contentTypeUID: Internal.UID.ContentType;
    attributeName: string;
  }) {
    return async (parent: any, args: any, ctx: any) => {
      // A caller with subject-aware permissions reads a dynamic zone only where the rules of the
      // entry it belongs to let them read that field of the parent: it is null otherwise
      const active = strapi.contentAPI.permissions.isSubjectAware(ctx?.state?.auth);
      const contentType = strapi.getModel(contentTypeUID);
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

      const data = await strapi.db?.query(contentTypeUID).load(parent, attributeName);

      return scope ? sanitizeNested(strapi, ctx, scope, attributeName, data) : data;
    };
  },
});
