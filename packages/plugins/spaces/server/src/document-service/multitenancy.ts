import type { Core } from '@strapi/types';

import { getService } from '../utils';

const READ_ACTIONS = new Set([
  'findMany',
  'findFirst',
  'findOne',
  'findPage',
  'count',
  'clone',
]);

const WRITE_ACTIONS = new Set([
  'create',
  'update',
  'publish',
  'unpublish',
  'discardDraft',
  'delete',
]);

/**
 * Strapi document-service middleware that injects the current request's
 * space into every operation on a space-scoped content type.
 *
 * - **Reads** (findMany/findOne/findFirst/findPage/count/clone): force-merges
 *   `params.filters.space = { id: currentSpaceId }`. Strapi's filter validator
 *   then accepts it (because we register `space` as a relation attribute in
 *   `register.ts`), and `transformParamsToQuery` merges it into the SQL
 *   `WHERE`. We deliberately **clobber** any user-provided `space` filter —
 *   you cannot query another tenant's data even by passing a filter.
 *
 * - **Writes** (create/update): stamps `params.data.space = currentSpaceId`
 *   if not already provided. This is the documented Strapi way to set a
 *   relation's FK at create time.
 *
 * We can't use `params.lookup` (the path i18n uses) because that field is
 * reserved for core transforms — `validateParams` throws "Invalid params:
 * 'lookup'" if a plugin sets it. See
 * `packages/core/core/src/services/document-service/repository.ts:285`.
 *
 * The middleware is a no-op when:
 * - The content type is not space-scoped (e.g. `plugin::spaces.space` itself).
 * - No request context exists (e.g. internal calls during bootstrap).
 * - No space has been resolved on `ctx.state.spaceId` (defensive).
 */
export const createMultitenancyMiddleware = (strapi: Core.Strapi) => {
  const middleware = async (ctx: any, next: () => any): Promise<any> => {
    const contentType = ctx.contentType;
    const { isSpaceScopedContentType } = getService('content-types');

    if (!isSpaceScopedContentType(contentType)) {
      return next();
    }

    const spaceId = strapi.requestContext.get()?.state?.spaceId as number | undefined;
    if (spaceId === undefined) {
      return next();
    }

    ctx.params = ctx.params ?? {};

    if (READ_ACTIONS.has(ctx.action) || WRITE_ACTIONS.has(ctx.action)) {
      // Force-merge — never trust a user-supplied `space` filter.
      ctx.params.filters = { ...(ctx.params.filters ?? {}), space: { id: spaceId } };
    }

    if (WRITE_ACTIONS.has(ctx.action) && (ctx.action === 'create' || ctx.action === 'update')) {
      ctx.params.data = ctx.params.data ?? {};
      if (ctx.params.data.space === undefined) {
        ctx.params.data.space = spaceId;
      }
    }

    return next();
  };

  return middleware as any;
};
